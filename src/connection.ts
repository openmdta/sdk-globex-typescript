import type {ListingSelector, ListingEvent} from "./generated/listing.js";
import {DATASETS} from "./generated/datasets.js";
import {decodeCatalogLookup, type CatalogDimensions, type CatalogLookupParameters, type CatalogLookupResult} from "./lookup.js";
import {decodeCatalogSearch, type CatalogSearchParameters, type CatalogSearchResult} from "./search.js";
import type { StreamMetadata } from "./generated/activity.js";
import { KEYFIGURES_CONTRACTS, decodeKeyfigures, type CatalogKeyfigures, type KeyfiguresCatalog, type KeyfiguresSearchParameters, type KeyfiguresPolicy, type SingleRequestHandle } from "./keyfigures.js";
import { tokenBytes, type TokenSource } from "./mdtoken.js";
import { selectorExpression, type MarketSelector } from "./selector.js";
import {
  BLOCK_BINDINGS,
  type BlockName,
  type SnapshotBlockName,
  type StreamBlockName,
  type TsCandleBlockName,
  type TsCandleStreamBlockName,
  type TsRawBlockName,
  type TsRawStreamBlockName,
} from "./generated/bindings.js";
import {
  type CatalogDescriptorSelection,
  type CatalogFieldDescriptor,
} from "./catalog.js";
import {
  ProtocolError,
  RequestError,
  WEBSOCKET_SUBPROTOCOL,
  blockMask,
  decodeBatch,
  decodeStreamMetadata,
  decodeListingResponse,
  decodeCatalogFields,
  decodeCatalogRecord,
  decodeKeyfiguresResult,
  decodeCatalogSearchResult,
  decodeCatalogLookupResult,
  decodeResponse,
  encodeRequest,
  type MarketDataBatch,
  type MarketDataMessage,
  type MarketDataDatasetRecord,
  type ResponsePhase,
  type CatalogLifecycle,
  type CatalogWireField,
  type Request,
  type Response,
  type StandardResponse,
} from "./protocol.js";

export interface ConnectOptions {
  readonly url: string;
  readonly token: TokenSource;
  readonly webSocket?: typeof WebSocket;
}

export interface TraceContext {
  readonly traceId: Uint8Array;
  readonly parentSpanId: Uint8Array;
}

export interface LatestParameters<B extends SnapshotBlockName = SnapshotBlockName> {
  readonly selector: MarketSelector;
  /** Pin routing to one Dataset. Dataset namespace methods set this automatically. */
  readonly dataset?: string;
  readonly blocks?: readonly B[];
  readonly signal?: AbortSignal;
  /** Adjust prices and quantities for confirmed splits; raw is the default. */
  readonly adjustment?: "raw" | "split";
  readonly trace?: TraceContext;
}

export interface LatestStreamParameters<B extends StreamBlockName = StreamBlockName> {
  readonly selector: MarketSelector;
  /** Pin routing to one Dataset. Dataset namespace methods set this automatically. */
  readonly dataset?: string;
  readonly blocks?: readonly B[];
  readonly signal?: AbortSignal;
  /** Adjust prices and quantities for confirmed splits; raw is the default. */
  readonly adjustment?: "raw" | "split";
  readonly trace?: TraceContext;
}

export interface TsRawParameters<B extends TsRawBlockName = TsRawBlockName> {
  readonly selector: MarketSelector;
  /** Pin routing to one Dataset. Dataset namespace methods set this automatically. */
  readonly dataset?: string;
  readonly blocks?: readonly B[];
  readonly from: bigint;
  readonly through: bigint;
  readonly maxMessages?: number;
  readonly quality?: string;
  readonly signal?: AbortSignal;
  /** Adjust prices and quantities for confirmed splits; raw is the default. */
  readonly adjustment?: "raw" | "split";
  readonly trace?: TraceContext;
}

export interface TsRawStreamParameters<B extends TsRawStreamBlockName = TsRawStreamBlockName>
  extends TsRawParameters<B> {}

export interface TsCandleParameters<B extends TsCandleBlockName = TsCandleBlockName> {
  readonly selector: MarketSelector;
  /** Pin routing to one Dataset. Dataset namespace methods set this automatically. */
  readonly dataset?: string;
  readonly blocks?: readonly B[];
  readonly from: bigint;
  readonly through: bigint;
  readonly cadenceMicros: bigint;
  readonly quality?: string;
  readonly signal?: AbortSignal;
  /** Adjust prices and quantities for confirmed splits; raw is the default. */
  readonly adjustment?: "raw" | "split";
  readonly trace?: TraceContext;
}

export interface TsCandleStreamParameters<B extends TsCandleStreamBlockName = TsCandleStreamBlockName>
  extends TsCandleParameters<B> {
  readonly updateIntervalMillis?: number;
}

type CatalogFieldWildcard = "*";
export type LatestOptions<B extends SnapshotBlockName = SnapshotBlockName> = Omit<LatestParameters<B>, "selector">;
export type LatestStreamOptions<B extends StreamBlockName = StreamBlockName> = Omit<LatestStreamParameters<B>, "selector">;
export type TsRawOptions<B extends TsRawBlockName = TsRawBlockName> = Omit<TsRawParameters<B>, "selector" | "from" | "through">;
export type TsRawStreamOptions<B extends TsRawStreamBlockName = TsRawStreamBlockName> = Omit<TsRawStreamParameters<B>, "selector" | "from" | "through">;
export type TsCandleOptions<B extends TsCandleBlockName = TsCandleBlockName> = Omit<TsCandleParameters<B>, "selector" | "from" | "through" | "cadenceMicros">;
export type TsCandleStreamOptions<B extends TsCandleStreamBlockName = TsCandleStreamBlockName> = Omit<TsCandleStreamParameters<B>, "selector" | "from" | "through" | "cadenceMicros">;

export interface DatasetRecord<C extends string, V extends object> {
  readonly requestId: bigint;
  readonly phase: "SNAPSHOT" | "UPDATE";
  readonly dataset: C;
  readonly selector: MarketSelector | string;
  readonly datasetRecordKey: string;
  readonly exists: boolean;
  readonly lifecycle: CatalogLifecycle | null;
  readonly fields: Partial<V>;
  readonly rawFields: readonly CatalogWireField[];
}

export interface RequestHandle<T> extends AsyncIterable<T> {
  readonly id: bigint;
  readonly closed: boolean;
  cancel(): Promise<boolean>;
  /** Called before reconnect replays this request with a fresh server snapshot. */
  onReplay(listener: () => void): () => void;
}

export interface MultiRequestHandle<T> extends AsyncIterable<T> {
  readonly ids: readonly bigint[];
  readonly closed: boolean;
  cancel(): Promise<boolean>;
}

export interface DatasetReadOptions<D extends readonly CatalogFieldDescriptor[] = readonly CatalogFieldDescriptor[]> {
  readonly fields?: D;
  readonly trace?: TraceContext;
}

export interface DatasetClient<C extends string> {
  readonly id: C;
  read<const D extends readonly CatalogFieldDescriptor[]>(selector: MarketSelector, options?: DatasetReadOptions<D>): RequestHandle<DatasetRecord<C, CatalogDescriptorSelection<D>>>;
  search(parameters?: CatalogSearchParameters): SingleRequestHandle<CatalogSearchResult>;
  lookup(query: string | CatalogDimensions, options?: Pick<CatalogLookupParameters, "cursor" | "limit" | "trace">): SingleRequestHandle<CatalogLookupResult>;
  latest<const B extends SnapshotBlockName>(selector: MarketSelector, options?: LatestOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
  latestBatched<const B extends SnapshotBlockName>(selector: MarketSelector, options?: LatestOptions<B>): RequestHandle<MarketDataBatch<B>>;
  latestStream<const B extends StreamBlockName>(selector: MarketSelector, options?: LatestStreamOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
  latestStreamBatched<const B extends StreamBlockName>(selector: MarketSelector, options?: LatestStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
  timeseries<const B extends TsRawBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataMessage<B>>;
  timeseriesBatched<const B extends TsRawBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataBatch<B>>;
}

export type DatasetNamespace = {
  readonly [Alias in keyof typeof DATASETS]: DatasetClient<(typeof DATASETS)[Alias]>;
};

export interface SelectedClient {
  read<const D extends readonly CatalogFieldDescriptor[]>(options?: DatasetReadOptions<D>): RequestHandle<DatasetRecord<string, CatalogDescriptorSelection<D>>>;
  latest<const B extends SnapshotBlockName>(options?: LatestOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
  latestBatched<const B extends SnapshotBlockName>(options?: LatestOptions<B>): RequestHandle<MarketDataBatch<B>>;
  latestStream<const B extends StreamBlockName>(options?: LatestStreamOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
  latestStreamBatched<const B extends StreamBlockName>(options?: LatestStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
  timeseries<const B extends TsRawBlockName>(from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataMessage<B>>;
  timeseriesBatched<const B extends TsRawBlockName>(from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataBatch<B>>;
}

export interface MultiSelectedClient {
  read<const D extends readonly CatalogFieldDescriptor[]>(options?: DatasetReadOptions<D>): MultiRequestHandle<DatasetRecord<string, CatalogDescriptorSelection<D>>>;
  latest<const B extends SnapshotBlockName>(options?: LatestOptions<B>): MultiRequestHandle<ResolvedMarketDataMessage<B>>;
  latestBatched<const B extends SnapshotBlockName>(options?: LatestOptions<B>): MultiRequestHandle<MarketDataBatch<B>>;
  latestStream<const B extends StreamBlockName>(options?: LatestStreamOptions<B>): MultiRequestHandle<ResolvedMarketDataMessage<B>>;
  latestStreamBatched<const B extends StreamBlockName>(options?: LatestStreamOptions<B>): MultiRequestHandle<MarketDataBatch<B>>;
}

export interface ResolvedMarketDataMessage<N extends BlockName = BlockName> extends MarketDataMessage<N> {
  readonly requestId: bigint;
  readonly phase: ResponsePhase;
  readonly selector: MarketSelector;
  readonly datasetRecord: MarketDataDatasetRecord;
}

export interface StreamMetadataParameters {
  readonly dataset: string;
  readonly quality: "RT" | "DL" | "EOD";
  readonly trace?: TraceContext;
}

export interface Connection {
  readonly dataset: DatasetNamespace;
  select(selector: MarketSelector): SelectedClient;
  select(selectors: readonly [MarketSelector, ...MarketSelector[]]): MultiSelectedClient;
  streamMetadata(dataset: string, quality: "RT" | "DL" | "EOD", options?: Pick<StreamMetadataParameters, "trace">): RequestHandle<StreamMetadata>;

  catalog_keyfigures<C extends KeyfiguresCatalog>(catalog: C): CatalogKeyfigures<C>;
  latest<const B extends SnapshotBlockName>(selector: MarketSelector, options?: LatestOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
  latestBatched<const B extends SnapshotBlockName>(selector: MarketSelector, options?: LatestOptions<B>): RequestHandle<MarketDataBatch<B>>;
  latestStream<const B extends StreamBlockName>(selector: MarketSelector, options?: LatestStreamOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
  latestStreamBatched<const B extends StreamBlockName>(selector: MarketSelector, options?: LatestStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
  tsRaw<const B extends TsRawBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataMessage<B>>;
  tsRawBatched<const B extends TsRawBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataBatch<B>>;
  tsCandle<const B extends TsCandleBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleOptions<B>): RequestHandle<MarketDataMessage<B>>;
  tsCandleBatched<const B extends TsCandleBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleOptions<B>): RequestHandle<MarketDataBatch<B>>;
  tsRawStream<const B extends TsRawStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawStreamOptions<B>): RequestHandle<MarketDataMessage<B>>;
  tsRawStreamBatched<const B extends TsRawStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
  tsCandleStream<const B extends TsCandleStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleStreamOptions<B>): RequestHandle<MarketDataMessage<B>>;
  tsCandleStreamBatched<const B extends TsCandleStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
  close(): Promise<void>;
}

export class ConnectionClosedError extends Error {
  constructor() {
    super("market-data connection was closed");
    this.name = "ConnectionClosedError";
  }
}

class MergedHandle<T> implements MultiRequestHandle<T> {
  readonly ids: readonly bigint[];

  constructor(private readonly handles: readonly RequestHandle<T>[]) {
    this.ids = Object.freeze(handles.map(handle => handle.id));
  }

  get closed(): boolean {
    return this.handles.every(handle => handle.closed);
  }

  async cancel(): Promise<boolean> {
    const cancelled = await Promise.all(this.handles.map(handle => handle.cancel()));
    return cancelled.some(Boolean);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    const iterators = this.handles.map(handle => handle[Symbol.asyncIterator]());
    const pending = new Map<number, Promise<{index: number; result: IteratorResult<T>}>>();
    for (let index = 0; index < iterators.length; index++) {
      pending.set(index, iterators[index]!.next().then(result => ({index, result})));
    }
    try {
      while (pending.size) {
        const {index, result} = await Promise.race(pending.values());
        if (result.done) {
          pending.delete(index);
        } else {
          pending.set(index, iterators[index]!.next().then(next => ({index, result: next})));
          yield result.value;
        }
      }
    } finally {
      await this.cancel();
    }
  }
}

export class RequestLaggedError extends Error {
  constructor() {
    super("request consumer lagged; the request was cancelled");
    this.name = "RequestLaggedError";
  }
}

const MAX_ACTIVE_REQUESTS = 131_072;
const MAX_BUFFERED_RESPONSES_PER_REQUEST = 32;
const MAX_BUFFERED_RESPONSE_BYTES_PER_REQUEST = 32 * 1024 * 1024;

const messagesWithSource = <N extends BlockName>(
  batch: MarketDataBatch<N>,
): readonly ResolvedMarketDataMessage<N>[] => batch.messages.map(message => Object.freeze({
  ...message,
  requestId: batch.requestId,
  phase: batch.phase,
  selector: batch.selector,
  datasetRecord: batch.datasetRecord,
}));

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

interface ActiveRequest {
  readonly command: "SNAPSHOT" | "STREAM" | "TS_RAW" | "TS_CANDLE" | "TS_RAW_STREAM" | "TS_CANDLE_STREAM" | "CATALOG" | "CATALOG_KEYFIGURES" | "STREAM_METADATA" | "CATALOG_SEARCH" | "CATALOG_LOOKUP" | "LISTING_LATEST";
  readonly encoded: Uint8Array<ArrayBuffer>;
  readonly handle: Handle<unknown>;
  readonly decode: (response: Extract<Response, { readonly kind: "response" }>) => unknown;
  readonly many?: boolean;
}

interface PendingCancellation {
  readonly targetId: bigint;
  readonly encoded: Uint8Array<ArrayBuffer>;
  readonly resolve: (cancelled: boolean) => void;
}

interface AuthenticationWaiter {
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
}

export const connect = async (options: ConnectOptions): Promise<Connection> => {
  if (!options.url) throw new TypeError("WebSocket URL must not be empty");
  if (!options.token) throw new TypeError("authentication token must not be empty");
  const connection = new ReconnectingConnection(options);
  await connection.ready();
  return connection;
};

/** Internal listing transport for source diagnostics and load tests. Not exported by the SDK package. */
export const connectInternal = async (options: ConnectOptions): Promise<ReconnectingConnection> => {
  const connection = await connect(options);
  return connection as ReconnectingConnection;
};

class ReconnectingConnection implements Connection {
  readonly #url: string;
  readonly #token: TokenSource;
  readonly #WebSocket: typeof WebSocket;
  readonly #active = new Map<bigint, ActiveRequest>();
  readonly #cancellations = new Map<bigint, PendingCancellation>();
  readonly #initial: Promise<void>;
  #resolveInitial!: () => void;
  #rejectInitial!: (error: Error) => void;
  #nextId = 2n;
  #socket: WebSocket | undefined;
  #auth: AuthenticationWaiter | undefined;
  #authenticated = false;
  #closing = false;
  #initialSettled = false;
  #lastHeartbeat = 0;

  #track(active: ActiveRequest): void {
    if (this.#active.size >= MAX_ACTIVE_REQUESTS) throw new RangeError("connection active-request capacity reached");
    this.#active.set(active.handle.id, active);
  }

  constructor(options: ConnectOptions) {
    this.#url = options.url;
    this.#token = options.token;
    this.#WebSocket = options.webSocket ?? WebSocket;
    this.#initial = new Promise<void>((resolve, reject) => {
      this.#resolveInitial = resolve;
      this.#rejectInitial = reject;
    });
    void this.#run();
  }

  ready(): Promise<void> {
    return this.#initial;
  }

  get dataset(): DatasetNamespace {
    const get = <C extends string>(id: C): DatasetClient<C> => ({
      id,
      read: <D extends readonly CatalogFieldDescriptor[]>(selector: MarketSelector, options: DatasetReadOptions<D> = {}) =>
        this.#startCatalog(
          id,
          [selectorExpression(selector)],
          options.fields ?? "*",
          options.trace,
          new Map([[selectorExpression(selector), selector]]),
        ) as RequestHandle<DatasetRecord<C, CatalogDescriptorSelection<D>>>,
      search: parameters => this.#catalogSearch(id, parameters),
      lookup: (query, options) => this.#catalogLookup(id, {
        ...(typeof query === "string" ? {expression: query} : {dimensions: query}),
        ...options,
      }),
      latest: (selector, options) => this.latest(selector, {...options, dataset: id}),
      latestBatched: (selector, options) => this.latestBatched(selector, {...options, dataset: id}),
      latestStream: (selector, options) => this.latestStream(selector, {...options, dataset: id}),
      latestStreamBatched: (selector, options) => this.latestStreamBatched(selector, {...options, dataset: id}),
      timeseries: (selector, from, through, options) => this.tsRaw(selector, from, through, {...options, dataset: id}),
      timeseriesBatched: (selector, from, through, options) => this.tsRawBatched(selector, from, through, {...options, dataset: id}),
    });
    return Object.freeze({
      ...Object.fromEntries(Object.entries(DATASETS).map(([alias, id]) => [alias, get(id)])),
    }) as DatasetNamespace;
  }

  select(selector: MarketSelector): SelectedClient;
  select(selectors: readonly [MarketSelector, ...MarketSelector[]]): MultiSelectedClient;
  select(selection: MarketSelector | readonly [MarketSelector, ...MarketSelector[]]): SelectedClient | MultiSelectedClient {
    const selected = (selector: MarketSelector): SelectedClient => Object.freeze({
      read: <D extends readonly CatalogFieldDescriptor[]>(options: DatasetReadOptions<D> = {}) =>
        this.#startCatalog(
          "",
          [selectorExpression(selector)],
          options.fields ?? "*",
          options.trace,
          new Map([[selectorExpression(selector), selector]]),
        ) as RequestHandle<DatasetRecord<string, CatalogDescriptorSelection<D>>>,
      latest: <B extends SnapshotBlockName>(options: LatestOptions<B> = {}) =>
        this.latest(selector, options),
      latestBatched: <B extends SnapshotBlockName>(options: LatestOptions<B> = {}) =>
        this.latestBatched(selector, options),
      latestStream: <B extends StreamBlockName>(options: LatestStreamOptions<B> = {}) =>
        this.latestStream(selector, options),
      latestStreamBatched: <B extends StreamBlockName>(options: LatestStreamOptions<B> = {}) =>
        this.latestStreamBatched(selector, options),
      timeseries: <B extends TsRawBlockName>(from: bigint, through: bigint, options: TsRawOptions<B> = {}) =>
        this.tsRaw(selector, from, through, options),
      timeseriesBatched: <B extends TsRawBlockName>(from: bigint, through: bigint, options: TsRawOptions<B> = {}) =>
        this.tsRawBatched(selector, from, through, options),
    });

    if (!Array.isArray(selection)) return selected(selection as MarketSelector);
    if (selection.length === 0) throw new TypeError("select requires at least one selector");
    const clients = selection.map(selected);
    return Object.freeze({
      read: <D extends readonly CatalogFieldDescriptor[]>(options: DatasetReadOptions<D> = {}) =>
        new MergedHandle(clients.map(client => client.read(options))),
      latest: <B extends SnapshotBlockName>(options: LatestOptions<B> = {}) =>
        new MergedHandle(clients.map(client => client.latest(options))),
      latestBatched: <B extends SnapshotBlockName>(options: LatestOptions<B> = {}) =>
        new MergedHandle(clients.map(client => client.latestBatched(options))),
      latestStream: <B extends StreamBlockName>(options: LatestStreamOptions<B> = {}) =>
        new MergedHandle(clients.map(client => client.latestStream(options))),
      latestStreamBatched: <B extends StreamBlockName>(options: LatestStreamOptions<B> = {}) =>
        new MergedHandle(clients.map(client => client.latestStreamBatched(options))),
    });
  }

  latest<const B extends SnapshotBlockName>(
    selector: MarketSelector, options: LatestOptions<B> = {},
  ): RequestHandle<ResolvedMarketDataMessage<B>> {
    return this.#start("SNAPSHOT", {selector, ...options}) as RequestHandle<ResolvedMarketDataMessage<B>>;
  }

  latestBatched<const B extends SnapshotBlockName>(
    selector: MarketSelector, options: LatestOptions<B> = {},
  ): RequestHandle<MarketDataBatch<B>> {
    return this.#start("SNAPSHOT", {selector, ...options}, undefined, true) as RequestHandle<MarketDataBatch<B>>;
  }

  latestStream<const B extends StreamBlockName>(
    selector: MarketSelector, options: LatestStreamOptions<B> = {},
  ): RequestHandle<ResolvedMarketDataMessage<B>> {
    return this.#start("STREAM", {selector, ...options}) as RequestHandle<ResolvedMarketDataMessage<B>>;
  }

  latestStreamBatched<const B extends StreamBlockName>(
    selector: MarketSelector, options: LatestStreamOptions<B> = {},
  ): RequestHandle<MarketDataBatch<B>> {
    return this.#start("STREAM", {selector, ...options}, undefined, true) as RequestHandle<MarketDataBatch<B>>;
  }

  tsRaw<const B extends TsRawBlockName>(
    selector: MarketSelector, from: bigint, through: bigint, options: TsRawOptions<B> = {},
  ): RequestHandle<MarketDataMessage<B>> {
    if (from > through) throw new RangeError("from must not exceed through");
    const maxMessages = options.maxMessages ?? 100;
    if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10_000) {
      throw new RangeError("maxMessages must be an integer from 1 through 10000");
    }
    this.#validateQuality(options.quality);
    return this.#start("TS_RAW", {selector, from, through, ...options}, {maxMessages}) as RequestHandle<MarketDataMessage<B>>;
  }

  tsRawBatched<const B extends TsRawBlockName>(
    selector: MarketSelector, from: bigint, through: bigint, options: TsRawOptions<B> = {},
  ): RequestHandle<MarketDataBatch<B>> {
    if (from > through) throw new RangeError("from must not exceed through");
    const maxMessages = options.maxMessages ?? 100;
    if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10_000) {
      throw new RangeError("maxMessages must be an integer from 1 through 10000");
    }
    this.#validateQuality(options.quality);
    return this.#start("TS_RAW", {selector, from, through, ...options}, { maxMessages }, true) as RequestHandle<MarketDataBatch<B>>;
  }

  tsCandle<const B extends TsCandleBlockName>(
    selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options: TsCandleOptions<B> = {},
  ): RequestHandle<MarketDataMessage<B>> {
    if (from > through) throw new RangeError("from must not exceed through");
    if (cadenceMicros <= 0n) throw new RangeError("cadenceMicros must be positive");
    this.#validateQuality(options.quality);
    return this.#start("TS_CANDLE", {selector, from, through, cadenceMicros, ...options}) as RequestHandle<MarketDataMessage<B>>;
  }

  tsCandleBatched<const B extends TsCandleBlockName>(
    selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options: TsCandleOptions<B> = {},
  ): RequestHandle<MarketDataBatch<B>> {
    if (from > through) throw new RangeError("from must not exceed through");
    if (cadenceMicros <= 0n) throw new RangeError("cadenceMicros must be positive");
    if (options.quality !== undefined && !["RT", "DL", "EOD"].includes(options.quality.trim().toUpperCase())) {
      throw new RangeError("quality must be RT, DL, or EOD");
    }
    return this.#start("TS_CANDLE", {selector, from, through, cadenceMicros, ...options}, undefined, true) as RequestHandle<MarketDataBatch<B>>;
  }

  tsRawStream<const B extends TsRawStreamBlockName>(
    selector: MarketSelector, from: bigint, through: bigint, options: TsRawStreamOptions<B> = {},
  ): RequestHandle<MarketDataMessage<B>> {
    if (from > through) throw new RangeError("from must not exceed through");
    const maxMessages = options.maxMessages ?? 100;
    if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10_000) {
      throw new RangeError("maxMessages must be an integer from 1 through 10000");
    }
    this.#validateQuality(options.quality, false);
    return this.#start("TS_RAW_STREAM", {selector, from, through, ...options}, {maxMessages}) as RequestHandle<MarketDataMessage<B>>;
  }

  tsRawStreamBatched<const B extends TsRawStreamBlockName>(
    selector: MarketSelector, from: bigint, through: bigint, options: TsRawStreamOptions<B> = {},
  ): RequestHandle<MarketDataBatch<B>> {
    if (from > through) throw new RangeError("from must not exceed through");
    const maxMessages = options.maxMessages ?? 100;
    if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10_000) {
      throw new RangeError("maxMessages must be an integer from 1 through 10000");
    }
    this.#validateQuality(options.quality, false);
    return this.#start("TS_RAW_STREAM", {selector, from, through, ...options}, { maxMessages }, true) as RequestHandle<MarketDataBatch<B>>;
  }

  tsCandleStream<const B extends TsCandleStreamBlockName>(
    selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options: TsCandleStreamOptions<B> = {},
  ): RequestHandle<MarketDataMessage<B>> {
    if (from > through) throw new RangeError("from must not exceed through");
    if (cadenceMicros <= 0n) throw new RangeError("cadenceMicros must be positive");
    this.#validateQuality(options.quality, false);
    const updateIntervalMillis = options.updateIntervalMillis ?? 1_000;
    if (!Number.isInteger(updateIntervalMillis) || updateIntervalMillis < 0 || updateIntervalMillis > 0xffff_ffff) {
      throw new RangeError("updateIntervalMillis must be an unsigned 32-bit integer");
    }
    return this.#start("TS_CANDLE_STREAM", {selector, from, through, cadenceMicros, ...options}, {updateIntervalMillis}) as RequestHandle<MarketDataMessage<B>>;
  }

  tsCandleStreamBatched<const B extends TsCandleStreamBlockName>(
    selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options: TsCandleStreamOptions<B> = {},
  ): RequestHandle<MarketDataBatch<B>> {
    if (from > through) throw new RangeError("from must not exceed through");
    if (cadenceMicros <= 0n) throw new RangeError("cadenceMicros must be positive");
    this.#validateQuality(options.quality, false);
    const updateIntervalMillis = options.updateIntervalMillis ?? 1_000;
    if (!Number.isInteger(updateIntervalMillis) || updateIntervalMillis < 0 || updateIntervalMillis > 0xffff_ffff) {
      throw new RangeError("updateIntervalMillis must be an unsigned 32-bit integer");
    }
    return this.#start("TS_CANDLE_STREAM", {selector, from, through, cadenceMicros, ...options}, { updateIntervalMillis }, true) as RequestHandle<MarketDataBatch<B>>;
  }

  #validateQuality(quality: string | undefined, allowEod = true): void {
    if (quality === undefined) return;
    const normalized = quality.trim().toUpperCase();
    if (!["RT", "DL", "EOD"].includes(normalized) || (!allowEod && normalized === "EOD")) {
      throw new RangeError(allowEod ? "quality must be RT, DL, or EOD" : "streaming quality must be RT or DL");
    }
  }

  catalog_keyfigures<C extends KeyfiguresCatalog>(catalog: C): CatalogKeyfigures<C> {
    if (!Object.hasOwn(KEYFIGURES_CONTRACTS, catalog)) throw new TypeError(`unknown keyfigures catalog ${catalog}`);
    const start = (action: "search" | "instrument" | "schema", parameters: string, policy: KeyfiguresPolicy = {}) => {
      if (this.#closing) throw new ConnectionClosedError();
      if (policy.price_cutoff_ms !== undefined && (!Number.isSafeInteger(policy.price_cutoff_ms) || policy.price_cutoff_ms < 0)) throw new RangeError("price_cutoff_ms must be a nonnegative safe integer");
      if (policy.price_age_mode !== undefined && !["elapsed", "trading-time", "last-completed-session"].includes(policy.price_age_mode)) throw new RangeError("price_age_mode is invalid");
      if (new TextEncoder().encode(parameters).byteLength > 16_384) throw new RangeError("keyfigures request exceeds 16 KiB");
      const id = this.#nextId++;
      const handle = new Handle(id, () => this.#cancel(id));
      const active: ActiveRequest = {
        command: "CATALOG_KEYFIGURES", handle,
        encoded: encodeRequest({command: "CATALOG_KEYFIGURES", id, catalog, action, parameters, contractFingerprint: KEYFIGURES_CONTRACTS[catalog].fingerprint,
          ...(policy.price_cutoff_ms === undefined ? {} : {priceCutoffMs: BigInt(policy.price_cutoff_ms)}), ...(policy.price_age_mode === undefined ? {} : {priceAgeMode: policy.price_age_mode}), ...(policy.trace ? {trace: policy.trace} : {})}),
        decode: response => decodeKeyfigures(catalog, action, decodeKeyfiguresResult(response)),
      };
      this.#track(active);
      if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) this.#socket.send(active.encoded);
      return handle;
    };
    return {
      search: (parameters: KeyfiguresSearchParameters<C> = {}) => {
        const {price_cutoff_ms, price_age_mode, trace, ...query} = parameters;
        const policy = {...(price_cutoff_ms === undefined ? {} : {price_cutoff_ms}), ...(price_age_mode === undefined ? {} : {price_age_mode}), ...(trace ? {trace} : {})};
        return start("search", JSON.stringify(query, (_key, value) => {
          if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("keyfigures numbers must be finite");
          return value;
        }), policy) as ReturnType<CatalogKeyfigures<C>["search"]>;
      },
      instrument: (key: string, policy?: KeyfiguresPolicy) => {
        if (!key.trim()) throw new TypeError("Catalog record key required");
        return start("instrument", key, policy) as ReturnType<CatalogKeyfigures<C>["instrument"]>;
      },
      schema: () => start("schema", "") as ReturnType<CatalogKeyfigures<C>["schema"]>,
    };
  }

  async close(): Promise<void> {
    if (this.#closing) return;
    this.#closing = true;
    this.#authenticated = false;
    this.#auth?.reject(new ConnectionClosedError());
    this.#auth = undefined;
    if (!this.#initialSettled) {
      this.#initialSettled = true;
      this.#rejectInitial(new ConnectionClosedError());
    }
    this.#socket?.close(1000, "client closed");
    this.#socket = undefined;
    const error = new ConnectionClosedError();
    for (const active of this.#active.values()) active.handle.fail(error);
    this.#active.clear();
    for (const cancellation of this.#cancellations.values()) cancellation.resolve(false);
    this.#cancellations.clear();
  }

  #catalogSearch(catalog: string, parameters: CatalogSearchParameters = {}): SingleRequestHandle<CatalogSearchResult> {
    if (this.#closing) throw new ConnectionClosedError();
    const {trace, ...query} = parameters;
    const json = JSON.stringify(query, (_key, value) => {
      if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("search numbers must be finite");
      return value;
    });
    if (!catalog.trim() || new TextEncoder().encode(catalog).length > 256 || new TextEncoder().encode(json).length > 16_384) throw new RangeError("invalid Catalog search request size");
    const id = this.#nextId++, handle = new Handle<CatalogSearchResult>(id, () => this.#cancel(id));
    const active: ActiveRequest = {command: "CATALOG_SEARCH", handle: handle as Handle<unknown>,
      encoded: encodeRequest({command:"CATALOG_SEARCH",id,catalog,parameters:json,...(trace ? {trace} : {})}),
      decode: response => decodeCatalogSearch(decodeCatalogSearchResult(response))};
    this.#track(active);
    if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) this.#socket.send(active.encoded);
    return handle;
  }
  #catalogLookup(catalog: string, parameters: CatalogLookupParameters): SingleRequestHandle<CatalogLookupResult> {
    if (this.#closing) throw new ConnectionClosedError();
    const {trace, ...query} = parameters;
    const json = JSON.stringify(query, (_key, value) => {
      if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("search numbers must be finite");
      return value;
    });
    if (!catalog.trim() || new TextEncoder().encode(catalog).length > 256 || new TextEncoder().encode(json).length > 16_384) throw new RangeError("invalid Catalog search request size");
    const id = this.#nextId++, handle = new Handle<CatalogLookupResult>(id, () => this.#cancel(id));
    const active: ActiveRequest = {command: "CATALOG_LOOKUP", handle: handle as Handle<unknown>,
      encoded: encodeRequest({command:"CATALOG_LOOKUP",id,catalog,parameters:json,...(trace ? {trace} : {})}),
      decode: response => decodeCatalogLookup(decodeCatalogLookupResult(response))};
    this.#track(active);
    if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) this.#socket.send(active.encoded);
    return handle;
  }

  listingLatest(parameters: ListingSelector & {readonly trace?: TraceContext}): RequestHandle<ListingEvent> {
    if (this.#closing) throw new ConnectionClosedError();
    const {trace, ...selector} = parameters;
    if (!selector.dataset || !selector.key || new TextEncoder().encode(selector.key).length > 1024 || !["RT", "DL", "EOD"].includes(selector.quality) || !selector.blocks.length || selector.blocks.length > 64 || !selector.blocks.every(id => Number.isInteger(id) && id >= 0 && id <= 65535)) throw new TypeError("invalid listing selector");
    const id = this.#nextId++;
    const handle = new Handle<ListingEvent>(id, () => this.#cancel(id));
    const active: ActiveRequest = {command: "LISTING_LATEST", encoded: encodeRequest({command:"LISTING_LATEST",id,parameters:JSON.stringify(selector),...(trace ? {trace} : {})}), handle: handle as Handle<unknown>, decode: response => {
      const event = decodeListingResponse(response);
      if (event.source.dataset !== selector.dataset || event.source.quality !== selector.quality || event.source.key !== selector.key || event.source.blocks.length !== selector.blocks.length || event.source.blocks.some((id,index) => id !== selector.blocks[index])) throw new ProtocolError("listing source does not match request");
      return event;
    }};
    this.#track(active);
    if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) this.#socket.send(active.encoded);
    return handle;
  }

  streamMetadata(dataset: string, quality: "RT" | "DL" | "EOD", options: Pick<StreamMetadataParameters, "trace"> = {}): RequestHandle<StreamMetadata> {
    if (this.#closing) throw new ConnectionClosedError();
    const { trace } = options;
    if (!dataset.trim() || new TextEncoder().encode(dataset).length > 256 || !["RT", "DL", "EOD"].includes(quality)) {
      throw new TypeError("Stream metadata requires dataset and RT/DL/EOD quality");
    }
    const id = this.#nextId++;
    const handle = new Handle<StreamMetadata>(id, () => this.#cancel(id));
    const request: Request = { command: "STREAM_METADATA", id, dataset, quality, ...(trace ? { trace } : {}) };
    const active: ActiveRequest = {
      command: "STREAM_METADATA", encoded: encodeRequest(request), handle: handle as Handle<unknown>,
      decode: response => {
        const metadata = decodeStreamMetadata(response);
        if (metadata.dataset !== dataset || metadata.quality !== quality) throw new ProtocolError("Stream metadata response does not match request");
        return metadata;
      },
    };
    this.#track(active);
    if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
      this.#socket.send(active.encoded);
    }
    return handle;
  }

  #start(
    command: Exclude<ActiveRequest["command"], "CATALOG" | "CATALOG_KEYFIGURES" | "STREAM_METADATA" | "CATALOG_SEARCH" | "CATALOG_LOOKUP" | "LISTING_LATEST">,
    parameters: LatestParameters | LatestStreamParameters | TsRawParameters | TsCandleParameters | TsRawStreamParameters | TsCandleStreamParameters,
    normalized: { readonly maxMessages?: number; readonly updateIntervalMillis?: number } | undefined = undefined,
    batched = false,
  ): RequestHandle<unknown> {
    if (this.#closing) throw new ConnectionClosedError();
    const expression = selectorExpression(parameters.selector);
    if (parameters.selector.subject === "list" && command !== "SNAPSHOT" && command !== "STREAM") {
      throw new TypeError("list selectors are not supported for single-record timeseries");
    }
    for (const block of parameters.blocks ?? []) {
      if (!BLOCK_BINDINGS[block].commands.includes(command)) {
        throw new TypeError(`${block} is not available for ${command}`);
      }
    }
    const id = this.#nextId;
    this.#nextId += 1n;
    let request: Request;
    if (command === "SNAPSHOT" || command === "STREAM") {
      request = {
        command,
        id,
        blockMask: blockMask(parameters.blocks),
        expression,
        ...(parameters.dataset === undefined ? {} : {dataset: parameters.dataset}),
        adjustment: parameters.adjustment ?? "raw",
        ...(parameters.trace ? { trace: parameters.trace } : {}),
      };
    } else if (command === "TS_RAW" || command === "TS_RAW_STREAM") {
      const history = parameters as TsRawParameters;
      request = {
        command,
        id,
        blockMask: blockMask(history.blocks),
        from: history.from,
        through: history.through,
        maxRows: normalized?.maxMessages ?? 100,
        expression,
        ...(history.dataset === undefined ? {} : {dataset: history.dataset}),
        adjustment: history.adjustment ?? "raw",
        ...(history.quality === undefined ? {} : { quality: history.quality.trim().toUpperCase() }),
        ...(history.trace ? { trace: history.trace } : {}),
      };
    } else {
      const history = parameters as TsCandleStreamParameters;
      const candle = {
        id,
        blockMask: blockMask(history.blocks),
        from: history.from,
        through: history.through,
        cadenceMicros: history.cadenceMicros,
        expression,
        ...(history.dataset === undefined ? {} : {dataset: history.dataset}),
        adjustment: history.adjustment ?? "raw",
        ...(history.quality === undefined ? {} : { quality: history.quality.trim().toUpperCase() }),
        ...(history.trace ? { trace: history.trace } : {}),
      };
      request = command === "TS_CANDLE_STREAM"
        ? { command, ...candle, updateIntervalMillis: normalized?.updateIntervalMillis ?? 1_000 }
        : { command, ...candle };
    }
    const handle = new Handle<MarketDataBatch>(id, () => this.#cancel(id));
    if (parameters.signal?.aborted) void handle.cancel();
    else parameters.signal?.addEventListener("abort", () => void handle.cancel(), {once: true});
    const active = {
      command,
      encoded: encodeRequest(request),
      handle: handle as Handle<unknown>,
      many: !batched,
      decode: (response: StandardResponse) => {
        const batch = decodeBatch(response, parameters.selector);
        if (batched) return batch;
        return command === "SNAPSHOT" || command === "STREAM" ? messagesWithSource(batch) : batch.messages;
      },
    };
    this.#track(active);
    if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
      this.#socket.send(active.encoded);
    }
    return handle as RequestHandle<unknown>;
  }

  #startCatalog(
    catalog: string,
    identifiers: readonly string[],
    selection: readonly CatalogFieldDescriptor[] | CatalogFieldWildcard,
    trace: TraceContext | undefined,
    selectors: ReadonlyMap<string, MarketSelector> = new Map(),
  ): RequestHandle<DatasetRecord<string, Record<string, unknown>>> {
    if (this.#closing) throw new ConnectionClosedError();
    if (!identifiers.length || identifiers.length > 256 || identifiers.some((identifier) => !identifier.trim())) {
      throw new TypeError("Catalog requests require 1 through 256 non-empty identifiers");
    }
    if (selection !== "*" && selection.length > 64) {
      throw new TypeError("Catalog requests support at most 64 fields");
    }
    if (selection !== "*" && selection.some(field => field.label === "*")) {
      throw new TypeError("omit Dataset fields to request every field");
    }
    const wildcard = selection === "*";
    const descriptors = wildcard ? [] : selection;
    const id = this.#nextId;
    this.#nextId += 1n;
    const request: Request = {
      command: "CATALOG",
      id,
      catalog,
      identifiers,
      fields: wildcard ? [] : descriptors.map((descriptor) => descriptor.label),
      ...(trace ? { trace } : {}),
    };
    const handle = new Handle<DatasetRecord<string, Record<string, unknown>>>(id, () => this.#cancel(id));
    const active: ActiveRequest = {
      command: "CATALOG",
      encoded: encodeRequest(request),
      handle: handle as Handle<unknown>,
      decode: (response) => {
        const wire = decodeCatalogRecord(response);
        if (catalog && wire.catalog !== catalog) throw new ProtocolError(`Dataset response targets ${wire.catalog}, expected ${catalog}`);
        const dataset = wire.catalog;
        return {
          requestId: wire.requestId,
          phase: wire.phase,
          dataset,
          selector: selectors.get(wire.identifier) ?? wire.identifier,
          datasetRecordKey: wire.recordIdentifier,
          exists: wire.exists,
          lifecycle: wire.lifecycle,
          rawFields: wire.fields,
          fields: decodeCatalogFields(wire, descriptors, wildcard),
        };
      },
    };
    this.#track(active);
    if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
      this.#socket.send(active.encoded);
    }
    return handle;
  }

  #cancel(targetId: bigint): Promise<boolean> {
    const target = this.#active.get(targetId);
    if (!target) return Promise.resolve(false);
    const id = this.#nextId;
    this.#nextId += 1n;
    const encoded = encodeRequest({ command: "CANCEL", id, targetId });
    return new Promise<boolean>((resolve) => {
      this.#cancellations.set(id, { targetId, encoded, resolve });
      if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
        this.#socket.send(encoded);
      }
    });
  }

  async #run(): Promise<void> {
    let attempt = 0;
    while (!this.#closing) {
      try {
        await this.#openAndServe();
        attempt = 0;
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        if (!this.#initialSettled || error instanceof AuthenticationError) {
          this.#closing = true;
          this.#socket?.close();
          if (!this.#initialSettled) {
            this.#initialSettled = true;
            this.#rejectInitial(error);
          }
          for (const active of this.#active.values()) active.handle.fail(error);
          this.#active.clear();
          return;
        }
      }
      if (this.#closing) return;
      const ceiling = Math.min(30_000, 250 * 2 ** Math.min(attempt, 16));
      attempt += 1;
      await new Promise<void>((resolve) => setTimeout(resolve, Math.random() * ceiling));
    }
  }

  async #openAndServe(): Promise<void> {
    const socket = new this.#WebSocket(this.#url, WEBSOCKET_SUBPROTOCOL);
    socket.binaryType = "arraybuffer";
    this.#socket = socket;
    this.#authenticated = false;
    const closed = new Promise<void>((resolve) => {
      socket.addEventListener("close", () => resolve(), { once: true });
    });
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("WebSocket connection failed")), {
        once: true,
      });
      socket.addEventListener("close", () => reject(new Error("WebSocket closed before opening")), {
        once: true,
      });
    });
    if (socket.protocol !== WEBSOCKET_SUBPROTOCOL) {
      socket.close(1002, "subprotocol required");
      throw new ProtocolError(`server did not negotiate ${WEBSOCKET_SUBPROTOCOL}`);
    }
    socket.addEventListener("message", (event: MessageEvent<unknown>) => {
      void this.#receive(socket, event.data).catch(() => socket.close(1002, "invalid SBE message"));
    });
    const authenticated = new Promise<void>((resolve, reject) => {
      this.#auth = { resolve, reject };
    });
    try {
      const supplied = await Promise.race([
        Promise.resolve(typeof this.#token === "function" ? this.#token() : this.#token),
        closed.then(() => { throw new Error("WebSocket closed while obtaining a token"); }),
      ]);
      // Preserve legacy UTF-8 credentials; MDToken base64url has a fixed SBE header.
      const token = typeof supplied === "string" && !supplied.startsWith("AAABAAgAAA") ? supplied : tokenBytes(supplied);
      socket.send(encodeRequest({ command: "AUTH", id: 1n, token }));
    } catch (error) {
      socket.close(1008, "token provider failed");
      throw error;
    }
    await Promise.race([
      authenticated,
      closed.then(() => Promise.reject(new Error("WebSocket closed during authentication"))),
    ]);
    this.#authenticated = true;
    this.#lastHeartbeat = Date.now();
    const replay = this.#initialSettled;
    if (!this.#initialSettled) {
      this.#initialSettled = true;
      this.#resolveInitial();
    }
    for (const active of this.#active.values()) {
      if (replay) active.handle.replay();
      socket.send(active.encoded);
    }
    for (const cancellation of this.#cancellations.values()) socket.send(cancellation.encoded);
    const heartbeat = setInterval(() => {
      if (Date.now() - this.#lastHeartbeat >= 15_000) {
        socket.close(1002, "authentication heartbeat timed out");
      }
    }, 5_000);
    await closed;
    clearInterval(heartbeat);
    if (this.#socket === socket) this.#socket = undefined;
    this.#authenticated = false;
    this.#auth = undefined;
  }

  async #receive(socket: WebSocket, data: unknown): Promise<void> {
    if (socket !== this.#socket) return;
    let source: ArrayBuffer | ArrayBufferView;
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      source = data;
    } else if (data instanceof Blob) {
      source = await data.arrayBuffer();
    } else {
      throw new ProtocolError("server sent a non-binary WebSocket message");
    }
    this.#dispatch(decodeResponse(source));
  }

  #dispatch(response: Response): void {
    if (response.kind === "response" && response.requestId === 1n) {
      if (response.status === "ERROR") {
        const error = new AuthenticationError(response.error || "authentication failed");
        this.#auth?.reject(error);
        this.#auth = undefined;
        return;
      }
      if (response.status !== "CONTINUE" || response.message !== null) {
        this.#auth?.reject(new ProtocolError("AUTH response is not a keepalive"));
        this.#auth = undefined;
        return;
      }
      this.#lastHeartbeat = Date.now();
      this.#auth?.resolve();
      this.#auth = undefined;
      return;
    }
    if (response.kind === "cancel") {
      const pending = this.#cancellations.get(response.requestId);
      if (!pending || pending.targetId !== response.targetId) return;
      this.#cancellations.delete(response.requestId);
      const cancelled = response.cancelled;
      if (cancelled) {
        const target = this.#active.get(response.targetId);
        if (target) {
          target.handle.finish();
          this.#active.delete(response.targetId);
        }
      }
      pending.resolve(cancelled);
      return;
    }
    const active = this.#active.get(response.requestId);
    if (!active) return;
    if (response.status === "ERROR") {
      active.handle.fail(new RequestError(response.requestId, response.error || "request failed"));
      this.#active.delete(response.requestId);
    } else if (response.status === "DONE") {
      active.handle.finish();
      this.#active.delete(response.requestId);
    } else {
      try {
        const value = active.decode(response);
        const wireBytes = (response.message?.body.byteLength ?? 0) + 64;
        const values = active.many ? value as readonly unknown[] : [value];
        const bytesPerValue = Math.max(1, Math.ceil(wireBytes / Math.max(1, values.length)));
        if (!values.every(item => active.handle.push(item, bytesPerValue))) {
          void this.#cancel(response.requestId);
          active.handle.fail(new RequestLaggedError());
          this.#active.delete(response.requestId);
        }
      }
      catch (error) {
        active.handle.fail(error);
        this.#active.delete(response.requestId);
      }
    }
  }
}

class Handle<T> implements SingleRequestHandle<T> {
  readonly #replayListeners = new Set<() => void>();
  readonly id: bigint;
  readonly #cancelRequest: () => Promise<boolean>;
  readonly #values: Array<{ readonly value: T; readonly bytes: number } | undefined> = [];
  readonly #waiting: Array<{
    readonly resolve: (result: IteratorResult<T>) => void;
    readonly reject: (error: unknown) => void;
  }> = [];
  #terminal = false;
  #error: unknown;
  #cancelled: Promise<boolean> | undefined;
  #head = 0;
  #bufferedBytes = 0;

  constructor(id: bigint, cancelRequest: () => Promise<boolean>) {
    this.id = id;
    this.#cancelRequest = cancelRequest;
  }

  async await(): Promise<T> {
    const iterator = this[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done) throw new ProtocolError("request completed without a result");
    const end = await iterator.next();
    if (!end.done) {
      await this.cancel();
      throw new ProtocolError("single-result request returned multiple results");
    }
    return first.value;
  }

  get closed(): boolean {
    return this.#terminal;
  }

  onReplay(listener: () => void): () => void {
    this.#replayListeners.add(listener);
    return () => this.#replayListeners.delete(listener);
  }

  replay(): void {
    this.#values.length = 0;
    this.#head = 0;
    this.#bufferedBytes = 0;
    for (const listener of this.#replayListeners) listener();
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        const buffered = this.#values[this.#head];
        if (buffered !== undefined) {
          this.#values[this.#head] = undefined;
          this.#head += 1;
          this.#bufferedBytes -= buffered.bytes;
          return Promise.resolve({ value: buffered.value, done: false });
        }
        if (this.#error !== undefined) return Promise.reject(this.#error);
        if (this.#terminal) return Promise.resolve({ value: undefined, done: true });
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          this.#waiting.push({ resolve, reject });
        });
      },
      return: async () => {
        await this.cancel();
        return { value: undefined, done: true };
      },
    };
  }

  cancel(): Promise<boolean> {
    if (this.#terminal) return Promise.resolve(false);
    if (!this.#cancelled) {
      const cancellation = this.#cancelRequest().then((cancelled) => {
        if (!cancelled && this.#cancelled === cancellation) this.#cancelled = undefined;
        return cancelled;
      });
      this.#cancelled = cancellation;
    }
    return this.#cancelled;
  }

  push(value: T, bytes: number): boolean {
    if (this.#terminal) return false;
    const waiting = this.#waiting.shift();
    if (waiting) {
      waiting.resolve({ value, done: false });
      return true;
    }
    if (this.#values.length - this.#head >= MAX_BUFFERED_RESPONSES_PER_REQUEST
      || this.#bufferedBytes + bytes > MAX_BUFFERED_RESPONSE_BYTES_PER_REQUEST) return false;
    this.#values.push({ value, bytes });
    this.#bufferedBytes += bytes;
    return true;
  }

  finish(): void {
    if (this.#terminal) return;
    this.#terminal = true;
    for (const waiting of this.#waiting.splice(0)) {
      waiting.resolve({ value: undefined, done: true });
    }
  }

  fail(error: unknown): void {
    if (this.#terminal) return;
    this.#terminal = true;
    this.#error = error;
    this.#values.length = 0;
    this.#head = 0;
    this.#bufferedBytes = 0;
    for (const waiting of this.#waiting.splice(0)) waiting.reject(error);
  }
}
