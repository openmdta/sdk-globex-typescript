import type { ListingSelector, ListingEvent } from "./generated/listing.js";
import { DATASETS, DATASET_CAPABILITIES } from "./generated/datasets.js";
import { type CatalogDimensions, type CatalogLookupParameters, type CatalogLookupResult } from "./lookup.js";
import { type CatalogSearchParameters, type CatalogSearchResult } from "./search.js";
import type { StreamMetadata } from "./generated/activity.js";
import { type CatalogKeyfigures, type KeyfiguresCatalog, type SingleRequestHandle } from "./keyfigures.js";
import { type TokenSource } from "./mdtoken.js";
import { type ServiceNamespace } from "./generated/services.js";
import { type MarketSelector } from "./selector.js";
import { type BlockName, type SnapshotBlockName, type StreamBlockName, type TsCandleBlockName, type TsCandleStreamBlockName, type TsRawBlockName, type TsRawStreamBlockName } from "./generated/bindings.js";
import { type CatalogDescriptorSelection, type CatalogFieldDescriptor } from "./catalog.js";
import { type MarketDataBatch, type MarketDataGap, type MarketDataMessage, type MarketDataDatasetRecord, type ResponsePhase, type CatalogLifecycle, type CatalogWireField } from "./protocol.js";
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
export interface TsRawStreamParameters<B extends TsRawStreamBlockName = TsRawStreamBlockName> extends TsRawParameters<B> {
}
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
export interface TsCandleStreamParameters<B extends TsCandleStreamBlockName = TsCandleStreamBlockName> extends TsCandleParameters<B> {
    readonly updateIntervalMillis?: number;
}
export type LatestOptions<B extends SnapshotBlockName = SnapshotBlockName> = Omit<LatestParameters<B>, "selector">;
export type LatestStreamOptions<B extends StreamBlockName = StreamBlockName> = Omit<LatestStreamParameters<B>, "selector">;
export type TsRawOptions<B extends TsRawBlockName = TsRawBlockName> = Omit<TsRawParameters<B>, "selector" | "from" | "through">;
export type TsRawStreamOptions<B extends TsRawStreamBlockName = TsRawStreamBlockName> = Omit<TsRawStreamParameters<B>, "selector" | "from" | "through">;
export type TsCandleOptions<B extends TsCandleBlockName = TsCandleBlockName> = Omit<TsCandleParameters<B>, "selector" | "from" | "through" | "cadenceMicros">;
export type TsCandleStreamOptions<B extends TsCandleStreamBlockName = TsCandleStreamBlockName> = Omit<TsCandleStreamParameters<B>, "selector" | "from" | "through" | "cadenceMicros">;
export type TimeseriesPageOrder = "asc" | "desc";
/** Pass a page's nextCursor as the boundary of the next call. */
export type TimeseriesPageCursor = string;
export interface TimeseriesPageOptions<B extends BlockName> {
    readonly blocks?: readonly B[];
    readonly from?: bigint;
    readonly through?: bigint;
    readonly dataset?: string;
    readonly quality?: string;
    readonly adjustment?: "raw" | "split";
    readonly signal?: AbortSignal;
    readonly trace?: TraceContext;
}
export interface TimeseriesPage<B extends BlockName> {
    readonly rows: readonly MarketDataMessage<B>[];
    readonly from: bigint;
    readonly through: bigint;
    readonly nextCursor: TimeseriesPageCursor | null;
    /** 0 exact, 1 open, 2 partial coverage, 3 not ready. Check gaps before treating a page as complete. */
    readonly status: 0 | 1 | 2 | 3;
    readonly gaps: readonly MarketDataGap[];
}
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
    timeseriesPage<const B extends TsRawBlockName>(selector: MarketSelector, order: TimeseriesPageOrder, boundary: bigint | TimeseriesPageCursor, limit: number, options?: Omit<TimeseriesPageOptions<B>, "dataset">): SingleRequestHandle<TimeseriesPage<B>>;
    candlePage<const B extends TsCandleBlockName>(selector: MarketSelector, cadenceMicros: bigint, order: TimeseriesPageOrder, boundary: bigint | TimeseriesPageCursor, limit: number, options?: Omit<TimeseriesPageOptions<B>, "dataset">): SingleRequestHandle<TimeseriesPage<B>>;
}
export type DatasetNamespace = {
    readonly [Alias in keyof typeof DATASETS]: Pick<DatasetClient<(typeof DATASETS)[Alias]>, "id" | ("catalog" extends (typeof DATASET_CAPABILITIES)[Alias][number] ? "read" | "lookup" : never) | ("search" extends (typeof DATASET_CAPABILITIES)[Alias][number] ? "search" : never) | ("latest" extends (typeof DATASET_CAPABILITIES)[Alias][number] ? "latest" | "latestBatched" | "latestStream" | "latestStreamBatched" : never) | ("timeseries" extends (typeof DATASET_CAPABILITIES)[Alias][number] ? "timeseries" | "timeseriesBatched" | "timeseriesPage" | "candlePage" : never)>;
};
export interface SelectedClient {
    read<const D extends readonly CatalogFieldDescriptor[]>(options?: DatasetReadOptions<D>): RequestHandle<DatasetRecord<string, CatalogDescriptorSelection<D>>>;
    latest<const B extends SnapshotBlockName>(options?: LatestOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestBatched<const B extends SnapshotBlockName>(options?: LatestOptions<B>): RequestHandle<MarketDataBatch<B>>;
    latestStream<const B extends StreamBlockName>(options?: LatestStreamOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestStreamBatched<const B extends StreamBlockName>(options?: LatestStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
    timeseries<const B extends TsRawBlockName>(from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataMessage<B>>;
    timeseriesBatched<const B extends TsRawBlockName>(from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataBatch<B>>;
    timeseriesPage<const B extends TsRawBlockName>(order: TimeseriesPageOrder, boundary: bigint | TimeseriesPageCursor, limit: number, options?: TimeseriesPageOptions<B>): SingleRequestHandle<TimeseriesPage<B>>;
    candlePage<const B extends TsCandleBlockName>(cadenceMicros: bigint, order: TimeseriesPageOrder, boundary: bigint | TimeseriesPageCursor, limit: number, options?: TimeseriesPageOptions<B>): SingleRequestHandle<TimeseriesPage<B>>;
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
    readonly service: ServiceNamespace;
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
    tsRawPage<const B extends TsRawBlockName>(selector: MarketSelector, order: TimeseriesPageOrder, boundary: bigint | TimeseriesPageCursor, limit: number, options?: TimeseriesPageOptions<B>): SingleRequestHandle<TimeseriesPage<B>>;
    tsCandlePage<const B extends TsCandleBlockName>(selector: MarketSelector, cadenceMicros: bigint, order: TimeseriesPageOrder, boundary: bigint | TimeseriesPageCursor, limit: number, options?: TimeseriesPageOptions<B>): SingleRequestHandle<TimeseriesPage<B>>;
    tsRawStream<const B extends TsRawStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawStreamOptions<B>): RequestHandle<MarketDataMessage<B>>;
    tsRawStreamBatched<const B extends TsRawStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
    tsCandleStream<const B extends TsCandleStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleStreamOptions<B>): RequestHandle<MarketDataMessage<B>>;
    tsCandleStreamBatched<const B extends TsCandleStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
    close(): Promise<void>;
}
export declare class ConnectionClosedError extends Error {
    constructor();
}
export declare class RequestLaggedError extends Error {
    constructor();
}
export declare class AuthenticationError extends Error {
    constructor(message: string);
}
export declare const connect: (options: ConnectOptions) => Promise<Connection>;
/** Internal listing transport for source diagnostics and load tests. Not exported by the SDK package. */
export declare const connectInternal: (options: ConnectOptions) => Promise<ReconnectingConnection>;
declare class ReconnectingConnection implements Connection {
    #private;
    constructor(options: ConnectOptions);
    ready(): Promise<void>;
    get service(): ServiceNamespace;
    get dataset(): DatasetNamespace;
    select(selector: MarketSelector): SelectedClient;
    select(selectors: readonly [MarketSelector, ...MarketSelector[]]): MultiSelectedClient;
    latest<const B extends SnapshotBlockName>(selector: MarketSelector, options?: LatestOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestBatched<const B extends SnapshotBlockName>(selector: MarketSelector, options?: LatestOptions<B>): RequestHandle<MarketDataBatch<B>>;
    latestStream<const B extends StreamBlockName>(selector: MarketSelector, options?: LatestStreamOptions<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestStreamBatched<const B extends StreamBlockName>(selector: MarketSelector, options?: LatestStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
    tsRaw<const B extends TsRawBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataMessage<B>>;
    tsRawBatched<const B extends TsRawBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawOptions<B>): RequestHandle<MarketDataBatch<B>>;
    tsCandle<const B extends TsCandleBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleOptions<B>): RequestHandle<MarketDataMessage<B>>;
    tsCandleBatched<const B extends TsCandleBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleOptions<B>): RequestHandle<MarketDataBatch<B>>;
    tsRawPage<const B extends TsRawBlockName>(selector: MarketSelector, order: TimeseriesPageOrder, boundary: bigint | TimeseriesPageCursor, limit: number, options?: TimeseriesPageOptions<B>): SingleRequestHandle<TimeseriesPage<B>>;
    tsCandlePage<const B extends TsCandleBlockName>(selector: MarketSelector, cadenceMicros: bigint, order: TimeseriesPageOrder, boundary: bigint | TimeseriesPageCursor, limit: number, options?: TimeseriesPageOptions<B>): SingleRequestHandle<TimeseriesPage<B>>;
    tsRawStream<const B extends TsRawStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawStreamOptions<B>): RequestHandle<MarketDataMessage<B>>;
    tsRawStreamBatched<const B extends TsRawStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, options?: TsRawStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
    tsCandleStream<const B extends TsCandleStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleStreamOptions<B>): RequestHandle<MarketDataMessage<B>>;
    tsCandleStreamBatched<const B extends TsCandleStreamBlockName>(selector: MarketSelector, from: bigint, through: bigint, cadenceMicros: bigint, options?: TsCandleStreamOptions<B>): RequestHandle<MarketDataBatch<B>>;
    catalog_keyfigures<C extends KeyfiguresCatalog>(catalog: C): CatalogKeyfigures<C>;
    close(): Promise<void>;
    listingLatest(parameters: ListingSelector & {
        readonly trace?: TraceContext;
    }): RequestHandle<ListingEvent>;
    streamMetadata(dataset: string, quality: "RT" | "DL" | "EOD", options?: Pick<StreamMetadataParameters, "trace">): RequestHandle<StreamMetadata>;
}
export {};
//# sourceMappingURL=connection.d.ts.map