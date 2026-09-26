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
export type FeedEvent<Block> = {
    readonly kind: "message";
    readonly message: FeedMessage<Block>;
} | {
    readonly kind: "gap";
    readonly gap: FeedGap;
} | {
    readonly kind: "watermark";
    readonly throughMessageId: bigint;
} | {
    readonly kind: "reset";
};
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
export type FeedControl = {
    readonly kind: "gapOpened";
    readonly gap: FeedGap;
} | {
    readonly kind: "gapClosed";
    readonly gap: FeedGap;
} | {
    readonly kind: "bootstrapComplete";
    readonly throughMessageId: bigint;
};
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
export declare class MemoryFeedSink<Block> implements FeedSink<Block> {
    #private;
    readonly onWrite?: ((batch: FeedWrite<Block>) => void) | undefined;
    readonly records: Map<string, Map<string, MemoryFeedBlock<Block>>>;
    readonly gaps: FeedGap[];
    constructor(onWrite?: ((batch: FeedWrite<Block>) => void) | undefined);
    resume(): Promise<FeedResume | null>;
    write(batch: FeedWrite<Block>): Promise<void>;
}
/** Runs until cancelled or the live transport fails. Sink rejection stops delivery. */
export declare function streamFeed<Block>(transport: FeedTransport<Block>, sink: FeedSink<Block>, options?: StreamFeedOptions): Promise<void>;
//# sourceMappingURL=feed.d.ts.map