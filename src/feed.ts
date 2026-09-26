/** A source message carries every selected block for one Dataset record. */
export interface FeedMessage<Block> {
  readonly messageId: bigint;
  readonly recordKey: string;
  readonly blocks: ReadonlyMap<string, Block>;
}

export interface FeedGap {
  /** Exclusive lower bound. */
  readonly afterMessageId: bigint;
  /** Inclusive upper bound. */
  readonly throughMessageId: bigint;
}

export type FeedEvent<Block> =
  | { readonly kind: "message"; readonly message: FeedMessage<Block> }
  | { readonly kind: "gap"; readonly gap: FeedGap }
  | { readonly kind: "watermark"; readonly throughMessageId: bigint }
  | { readonly kind: "reset" };

/** The snapshot pointer is the last source message incorporated in the snapshot. */
export interface FeedSnapshot<Block> {
  readonly throughMessageId: bigint;
  readonly gaps: readonly FeedGap[];
  readonly messages: AsyncIterable<FeedMessage<Block>>;
}

export interface FeedTransport<Block> {
  live(signal: AbortSignal): AsyncIterable<FeedEvent<Block>>;
  recovery(afterMessageId: bigint, throughMessageId: bigint, signal: AbortSignal): AsyncIterable<FeedMessage<Block>>;
  streamSnapshot(signal: AbortSignal): Promise<FeedSnapshot<Block>>;
}

export interface FeedResume {
  readonly afterMessageId: bigint;
  readonly gaps: readonly FeedGap[];
  /** False while a previous latest-mode bootstrap was interrupted. */
  readonly initialized: boolean;
}

export type FeedControl =
  | { readonly kind: "gapOpened"; readonly gap: FeedGap }
  | { readonly kind: "gapClosed"; readonly gap: FeedGap }
  | { readonly kind: "bootstrapComplete"; readonly throughMessageId: bigint };

/** Data and control events must be committed atomically in the caller's storage medium. */
export interface FeedWrite<Block> {
  readonly messages: readonly FeedMessage<Block>[];
  readonly controls: readonly FeedControl[];
  readonly throughMessageId: bigint;
}

export interface FeedSink<Block> {
  resume(): Promise<FeedResume | null>;
  write(batch: FeedWrite<Block>): Promise<void>;
}

export interface StreamFeedOptions {
  readonly mode?: "latest" | "messages";
  readonly signal?: AbortSignal;
}

export interface MemoryFeedBlock<Block> {
  readonly messageId: bigint;
  readonly value: Block;
}

/** Simple process-local sink for callers that do not need restart durability. */
export class MemoryFeedSink<Block> implements FeedSink<Block> {
  readonly records = new Map<string, Map<string, MemoryFeedBlock<Block>>>();
  readonly gaps: FeedGap[] = [];
  #head = 0n;
  #initialized = false;
  #hasState = false;

  constructor(readonly onWrite?: (batch: FeedWrite<Block>) => void) {}

  async resume(): Promise<FeedResume | null> {
    return this.#hasState
      ? { afterMessageId: this.#head, gaps: [...this.gaps], initialized: this.#initialized }
      : null;
  }

  async write(batch: FeedWrite<Block>): Promise<void> {
    this.#hasState = true;
    if (batch.throughMessageId > this.#head) this.#head = batch.throughMessageId;
    for (const message of batch.messages) {
      let record = this.records.get(message.recordKey);
      if (!record) {
        record = new Map();
        this.records.set(message.recordKey, record);
      }
      for (const [name, value] of message.blocks) {
        const previous = record.get(name);
        if (!previous || previous.messageId < message.messageId) {
          record.set(name, { messageId: message.messageId, value });
        }
      }
    }
    for (const control of batch.controls) {
      if (control.kind === "bootstrapComplete") this.#initialized = true;
      else if (control.kind === "gapOpened") {
        if (!this.gaps.some(gap => gap.afterMessageId === control.gap.afterMessageId
          && gap.throughMessageId === control.gap.throughMessageId)) this.gaps.push(control.gap);
      } else {
        const index = this.gaps.findIndex(gap => gap.afterMessageId === control.gap.afterMessageId
          && gap.throughMessageId === control.gap.throughMessageId);
        if (index >= 0) this.gaps.splice(index, 1);
      }
    }
    this.onWrite?.(batch);
  }
}

/** Runs until cancelled or the live transport fails. Sink rejection stops delivery. */
export async function streamFeed<Block>(
  transport: FeedTransport<Block>,
  sink: FeedSink<Block>,
  options: StreamFeedOptions = {},
): Promise<void> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });

  let liveTask: Promise<void> | undefined;
  let recoveryTask = Promise.resolve();
  try {
    const resume = await sink.resume();
    let head = resume?.afterMessageId ?? 0n;
    let initializing = (options.mode ?? "latest") === "latest" && !resume?.initialized;
    const seen = new Map<string, Map<string, bigint>>();
    let writing = Promise.resolve();
    const commit = (batch: FeedWrite<Block>): Promise<void> => {
      const next = writing.then(() => sink.write(batch));
      writing = next;
      return next;
    };
    const select = (message: FeedMessage<Block>): FeedMessage<Block> | null => {
      if (!initializing) return message;
      let record = seen.get(message.recordKey);
      if (!record) {
        record = new Map();
        seen.set(message.recordKey, record);
      }
      const blocks = new Map<string, Block>();
      for (const [name, block] of message.blocks) {
        const previous = record.get(name);
        if (previous === undefined || previous < message.messageId) {
          blocks.set(name, block);
          record.set(name, message.messageId);
        }
      }
      return blocks.size ? { ...message, blocks } : null;
    };
    const openGap = async (gap: FeedGap): Promise<void> => {
      if (gap.throughMessageId <= gap.afterMessageId) return;
      if (gap.throughMessageId > head) head = gap.throughMessageId;
      await commit({ messages: [], controls: [{ kind: "gapOpened", gap }], throughMessageId: head });
    };
    const recover = async (gap: FeedGap): Promise<void> => {
      let after = gap.afterMessageId;
      let failures = 0;
      while (!controller.signal.aborted) {
        try {
          const requestAfter = after === gap.throughMessageId ? gap.afterMessageId : after;
          for await (const message of transport.recovery(requestAfter, gap.throughMessageId, controller.signal)) {
            if (message.messageId <= requestAfter || message.messageId > gap.throughMessageId) {
              throw new Error("recovery returned a message outside its requested range");
            }
            if (message.messageId <= after) continue;
            const selected = select(message);
            if (selected) await commit({ messages: [selected], controls: [], throughMessageId: head });
            after = message.messageId;
          }
          await commit({ messages: [], controls: [{ kind: "gapClosed", gap }], throughMessageId: head });
          return;
        } catch (error) {
          if (controller.signal.aborted) return;
          if (!(error instanceof Error) || /outside its requested range/.test(error.message)) throw error;
          failures += 1;
          await new Promise<void>(resolve => {
            const timer = setTimeout(resolve, Math.min(30_000, 250 * 2 ** Math.min(failures, 8)));
            controller.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, {once: true});
          });
        }
      }
    };
    const scheduleRecovery = (gap: FeedGap): void => {
      recoveryTask = recoveryTask.then(() => recover(gap));
      void recoveryTask.catch(error => controller.abort(error));
    };

    // Start both requests before awaiting either one. The first live event is
    // the source's atomic subscription fence, including on a quiet stream.
    const live = transport.live(controller.signal)[Symbol.asyncIterator]();
    const snapshotTask = initializing ? transport.streamSnapshot(controller.signal) : undefined;
    let first = await live.next();
    while (!first.done && first.value.kind === "reset") first = await live.next();
    if (first.done || first.value.kind !== "watermark") {
      throw new Error("feed live stream must begin with a watermark");
    }
    const liveStart = first.value.throughMessageId;
    if (!resume) {
      head = liveStart;
      await commit({ messages: [], controls: [], throughMessageId: head });
    }

    let awaitingFence = false;
    liveTask = (async () => {
      for (;;) {
        if (controller.signal.aborted) return;
        const next = await live.next();
        if (next.done) {
          if (controller.signal.aborted) return;
          throw new Error("feed live stream ended");
        }
        const event = next.value;
        if (event.kind === "reset") {
          awaitingFence = true;
          continue;
        }
        if (awaitingFence) {
          if (event.kind !== "watermark") throw new Error("replayed feed did not start with a watermark");
          awaitingFence = false;
          if (event.throughMessageId > head) {
            const gap = { afterMessageId: head, throughMessageId: event.throughMessageId };
            await openGap(gap);
            scheduleRecovery(gap);
          }
          continue;
        }
        if (event.kind === "message") {
          const selected = select(event.message);
          if (selected) await commit({ messages: [selected], controls: [], throughMessageId: head });
        } else if (event.kind === "gap") {
          await openGap(event.gap);
          scheduleRecovery(event.gap);
        } else if (event.throughMessageId > head) {
          head = event.throughMessageId;
          await commit({ messages: [], controls: [], throughMessageId: head });
        }
      }
    })().catch(error => {
      if (!controller.signal.aborted) throw error;
    });
    void liveTask.catch(error => controller.abort(error));

    if (initializing) {
      const snapshot = await Promise.race([snapshotTask!, liveTask.then(() => { throw new Error("feed live stream ended"); })]);
      const bootstrapGap = snapshot.throughMessageId < liveStart
        ? { afterMessageId: snapshot.throughMessageId, throughMessageId: liveStart }
        : null;
      for (const gap of snapshot.gaps) await openGap(gap);
      if (bootstrapGap) await openGap(bootstrapGap);
      for await (const message of snapshot.messages) {
        const selected = select(message);
        if (selected) await commit({ messages: [selected], controls: [], throughMessageId: head });
      }
      for (const gap of snapshot.gaps) await recover(gap);
      if (bootstrapGap) await recover(bootstrapGap);
      if (controller.signal.aborted) throw controller.signal.reason ?? new Error("feed bootstrap was interrupted");
      await commit({ messages: [], controls: [{ kind: "bootstrapComplete", throughMessageId: head }], throughMessageId: head });
      initializing = false;
      seen.clear();
    } else {
      if (resume && liveStart > resume.afterMessageId) {
        const gap = { afterMessageId: resume.afterMessageId, throughMessageId: liveStart };
        await openGap(gap);
        scheduleRecovery(gap);
      }
      for (const gap of resume?.gaps ?? []) scheduleRecovery(gap);
    }

    await liveTask;
    await recoveryTask;
  } finally {
    controller.abort();
    options.signal?.removeEventListener("abort", abort);
    await Promise.allSettled([liveTask, recoveryTask]);
  }
}
