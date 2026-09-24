import type {CatalogDescriptorSelection, CatalogFieldDescriptor} from "./catalog.js";
import type {Connection, DatasetReadParameters, DatasetRecord, ResolvedMarketDataMessage, RequestHandle} from "./connection.js";
import type {MarketDataFields, StreamBlockName} from "./generated/bindings.js";
import type {MarketDataDatasetRecord} from "./protocol.js";
import {DATASETS} from "./generated/datasets.js";
import {selectorExpression, type MarketSelector} from "./selector.js";

export interface ExternalStoreOptions {
  /** Keep an unused upstream subscription warm for quick component reselection. */
  readonly unsubscribeGraceMillis?: number;
  /** Reuse finite Dataset reads without retaining an upstream subscription. */
  readonly catalogExpiryMillis?: number;
}

export interface CachedDatasetClient<C extends string> {
  readonly id: C;
  read<const D extends readonly CatalogFieldDescriptor[]>(parameters: DatasetReadParameters<D>): Promise<readonly DatasetRecord<C, CatalogDescriptorSelection<D>>[]>;
}

export type CachedDatasetNamespace = {
  readonly [Alias in keyof typeof DATASETS]: CachedDatasetClient<(typeof DATASETS)[Alias]>;
} & {
  get<C extends string>(dataset: C): CachedDatasetClient<C>;
};

export interface ExternalRecordSnapshot<N extends StreamBlockName = StreamBlockName> {
  readonly datasetRecord: MarketDataDatasetRecord;
  readonly fields: MarketDataFields<N>;
  readonly lastMessageId: bigint;
}

export interface ExternalRecord<N extends StreamBlockName = StreamBlockName> {
  readonly identity: string;
  readonly datasetRecord: MarketDataDatasetRecord;
  getSnapshot(): ExternalRecordSnapshot<N>;
  subscribe(listener: () => void): () => void;
}

export interface ExternalSelectionSnapshot<N extends StreamBlockName = StreamBlockName> {
  readonly selector: MarketSelector;
  /** Stable references; their accumulated values update independently. */
  readonly records: readonly ExternalRecord<N>[];
  readonly pending: boolean;
  readonly error: unknown | null;
}

export interface ExternalSelection<N extends StreamBlockName = StreamBlockName> {
  getSnapshot(): ExternalSelectionSnapshot<N>;
  subscribe(listener: () => void): () => void;
}

interface RecordEntry {
  readonly identity: string;
  readonly datasetRecord: MarketDataDatasetRecord;
  readonly listeners: Set<() => void>;
  reference: ExternalRecord<StreamBlockName>;
  snapshot: ExternalRecordSnapshot<StreamBlockName>;
}

interface SelectionEntry<N extends StreamBlockName> {
  readonly selector: MarketSelector;
  readonly blocks?: readonly N[];
  readonly listeners: Set<() => void>;
  readonly records: Map<string, ExternalRecord<N>>;
  reference: ExternalSelection<N>;
  handle: RequestHandle<ResolvedMarketDataMessage<N>> | undefined;
  generation: number;
  closeTimer: ReturnType<typeof setTimeout> | undefined;
  snapshot: ExternalSelectionSnapshot<N>;
}

export class MarketDataExternalStore {
  readonly #selections = new Map<string, SelectionEntry<StreamBlockName>>();
  readonly #records = new Map<string, RecordEntry>();
  readonly #catalog = new Map<string, {readonly expiresAt: number; readonly value: Promise<readonly DatasetRecord<string, Record<string, unknown>>[]>}>();
  readonly #grace: number;
  readonly #catalogExpiry: number;

  constructor(private readonly connection: Connection, options: ExternalStoreOptions = {}) {
    this.#grace = options.unsubscribeGraceMillis ?? 5_000;
    this.#catalogExpiry = options.catalogExpiryMillis ?? 3_600_000;
  }

  get dataset(): CachedDatasetNamespace {
    const get = <C extends string>(id: C): CachedDatasetClient<C> => Object.freeze({
      id,
      read: <D extends readonly CatalogFieldDescriptor[]>(parameters: DatasetReadParameters<D>) =>
        this.#readDataset(id, parameters),
    });
    return Object.freeze({
      ...Object.fromEntries(Object.entries(DATASETS).map(([alias, id]) => [alias, get(id)])),
      get,
    }) as CachedDatasetNamespace;
  }

  #readDataset<C extends string, D extends readonly CatalogFieldDescriptor[]>(
    dataset: C,
    parameters: DatasetReadParameters<D>,
  ): Promise<readonly DatasetRecord<C, CatalogDescriptorSelection<D>>[]> {
    const fieldKey = parameters.fields
      ?.map(field => `${field.label}:${field.wireId ?? ""}:${field.fixedLength ?? ""}:${field.multiple ?? false}`)
      .join(",") ?? "*";
    const key = `${dataset}\u0000${selectorExpression(parameters.selector)}\u0000${fieldKey}`;
    const cached = this.#catalog.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as Promise<readonly DatasetRecord<C, CatalogDescriptorSelection<D>>[]>;
    }
    const value = (async () => {
      const records: DatasetRecord<C, CatalogDescriptorSelection<D>>[] = [];
      for await (const record of this.connection.dataset.get(dataset).read(parameters)) records.push(record);
      return Object.freeze(records);
    })();
    this.#catalog.set(key, {
      expiresAt: Date.now() + this.#catalogExpiry,
      value: value as Promise<readonly DatasetRecord<string, Record<string, unknown>>[]>,
    });
    void value.catch(() => {
      if (this.#catalog.get(key)?.value === value) this.#catalog.delete(key);
    });
    return value;
  }

  latestStream<const N extends StreamBlockName>(selector: MarketSelector, blocks?: readonly N[]): ExternalSelection<N> {
    const key = `${selectorExpression(selector)}\u0000${[...(blocks ?? [])].sort().join(",")}`;
    const existing = this.#selections.get(key);
    if (existing) return existing.reference as ExternalSelection<N>;

    const entry = {
      selector,
      ...(blocks === undefined ? {} : {blocks}),
      listeners: new Set<() => void>(),
      records: new Map<string, ExternalRecord<N>>(),
      reference: undefined,
      handle: undefined,
      generation: 0,
      closeTimer: undefined,
      snapshot: Object.freeze({selector, records: Object.freeze([]), pending: true, error: null}),
    } as unknown as SelectionEntry<N>;
    entry.reference = Object.freeze({
      getSnapshot: () => entry.snapshot,
      subscribe: (listener: () => void) => {
        if (entry.closeTimer !== undefined) {
          clearTimeout(entry.closeTimer);
          entry.closeTimer = undefined;
        }
        entry.listeners.add(listener);
        if (!entry.handle) this.#open(entry);
        return () => {
          entry.listeners.delete(listener);
          if (entry.listeners.size === 0 && entry.closeTimer === undefined) {
            entry.closeTimer = setTimeout(() => {
              entry.closeTimer = undefined;
              if (entry.listeners.size !== 0) return;
              entry.generation += 1;
              const handle = entry.handle;
              entry.handle = undefined;
              if (handle) void handle.cancel();
            }, this.#grace);
          }
        };
      },
    });
    this.#selections.set(key, entry as SelectionEntry<StreamBlockName>);
    return entry.reference;
  }

  #record<N extends StreamBlockName>(msg: ResolvedMarketDataMessage<N>): ExternalRecord<N> {
    const identity = `${msg.datasetRecord.dataset}\u0000${msg.datasetRecord.datasetRecordKey}`;
    let entry = this.#records.get(identity);
    if (!entry) {
      entry = {
        identity,
        datasetRecord: msg.datasetRecord,
        listeners: new Set(),
        reference: undefined as unknown as ExternalRecord<StreamBlockName>,
        snapshot: Object.freeze({
          datasetRecord: msg.datasetRecord,
          fields: Object.freeze({...msg.fields}),
          lastMessageId: msg.messageId,
        }),
      };
      const created = entry;
      entry.reference = Object.freeze({
        identity,
        datasetRecord: entry.datasetRecord,
        getSnapshot: () => created.snapshot,
        subscribe: (listener: () => void) => {
          created.listeners.add(listener);
          return () => created.listeners.delete(listener);
        },
      });
      this.#records.set(identity, entry);
    } else {
      entry.snapshot = Object.freeze({
        datasetRecord: entry.datasetRecord,
        fields: Object.freeze({...entry.snapshot.fields, ...msg.fields}) as MarketDataFields<StreamBlockName>,
        lastMessageId: msg.messageId,
      });
    }
    for (const listener of entry.listeners) listener();
    return entry.reference as ExternalRecord<N>;
  }

  #open<N extends StreamBlockName>(entry: SelectionEntry<N>): void {
    const generation = ++entry.generation;
    const reset = () => {
      entry.records.clear();
      entry.snapshot = Object.freeze({selector: entry.selector, records: Object.freeze([]), pending: true, error: null});
      for (const listener of entry.listeners) listener();
    };
    if (entry.records.size || !entry.snapshot.pending) reset();
    const handle = this.connection.latestStream({
      selector: entry.selector,
      ...(entry.blocks === undefined ? {} : {blocks: entry.blocks}),
    });
    entry.handle = handle;
    const stopReplay = handle.onReplay(reset);
    void (async () => {
      try {
        for await (const msg of handle) {
          if (entry.generation !== generation) break;
          const record = this.#record(msg);
          if (!entry.records.has(record.identity)) {
            entry.records.set(record.identity, record);
            entry.snapshot = Object.freeze({
              selector: entry.selector,
              records: Object.freeze([...entry.records.values()]),
              pending: false,
              error: null,
            });
            for (const listener of entry.listeners) listener();
          }
        }
      } catch (error) {
        if (entry.generation !== generation) return;
        entry.snapshot = Object.freeze({...entry.snapshot, pending: false, error});
        for (const listener of entry.listeners) listener();
      } finally {
        stopReplay();
        if (entry.generation === generation) {
          entry.handle = undefined;
          if (entry.snapshot.pending) {
            entry.snapshot = Object.freeze({...entry.snapshot, pending: false});
            for (const listener of entry.listeners) listener();
          }
        }
      }
    })();
  }
}

export const createExternalStore = (connection: Connection, options?: ExternalStoreOptions): MarketDataExternalStore =>
  new MarketDataExternalStore(connection, options);
