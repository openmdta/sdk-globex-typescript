import type { ListingSelector, ListingEvent } from "./generated/listing.js";
import { DATASETS } from "./generated/datasets.js";
import { type CatalogLookupParameters, type CatalogLookupResult } from "./lookup.js";
import { type CatalogSearchParameters, type CatalogSearchResult } from "./search.js";
import type { StreamMetadata } from "./generated/activity.js";
import { type CatalogKeyfigures, type KeyfiguresCatalog, type SingleRequestHandle } from "./keyfigures.js";
import { type TokenSource } from "./mdtoken.js";
import { type MarketSelector } from "./selector.js";
import { type BlockName, type SnapshotBlockName, type StreamBlockName, type TsCandleBlockName, type TsCandleStreamBlockName, type TsRawBlockName, type TsRawStreamBlockName } from "./generated/bindings.js";
import { type CatalogDescriptorSelection, type CatalogFieldDescriptor, type CatalogFieldName, type CatalogFieldSelection, type CatalogName, type CatalogValueMap } from "./catalog.js";
import { type MarketDataBatch, type MarketDataMessage, type MarketDataDatasetRecord, type ResponsePhase, type CatalogLifecycle, type CatalogWireField } from "./protocol.js";
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
type CatalogFieldWildcard = "*";
type CatalogParameterValues<C extends CatalogName, F extends readonly CatalogFieldName<C>[] | CatalogFieldWildcard> = F extends CatalogFieldWildcard ? CatalogValueMap[C] : F extends readonly CatalogFieldName<C>[] ? CatalogFieldSelection<C, F[number]> : never;
type CatalogDescriptorValues<C extends string, D extends readonly CatalogFieldDescriptor[] | CatalogFieldWildcard> = D extends CatalogFieldWildcard ? C extends CatalogName ? CatalogValueMap[C] : Record<string, unknown> : D extends readonly CatalogFieldDescriptor[] ? CatalogDescriptorSelection<D> : never;
export interface CatalogParameters<C extends CatalogName = CatalogName, F extends readonly CatalogFieldName<C>[] = readonly CatalogFieldName<C>[]> {
    readonly catalog: C;
    readonly identifiers: readonly string[];
    readonly fields?: F;
    readonly trace?: TraceContext;
}
export interface CatalogDescriptorParameters<C extends string, D extends readonly CatalogFieldDescriptor[]> {
    readonly catalog: C;
    readonly identifiers: readonly string[];
    readonly fields?: D;
    readonly trace?: TraceContext;
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
export interface DatasetReadParameters<D extends readonly CatalogFieldDescriptor[] = readonly CatalogFieldDescriptor[]> {
    readonly selector: MarketSelector;
    readonly fields?: D;
    readonly trace?: TraceContext;
}
export interface SelectedReadParameters<D extends readonly CatalogFieldDescriptor[] = readonly CatalogFieldDescriptor[]> {
    readonly fields?: D;
    readonly trace?: TraceContext;
}
export interface DatasetClient<C extends string> {
    readonly id: C;
    read<const D extends readonly CatalogFieldDescriptor[]>(parameters: DatasetReadParameters<D>): RequestHandle<DatasetRecord<C, CatalogDescriptorSelection<D>>>;
    search(parameters?: CatalogSearchParameters): SingleRequestHandle<CatalogSearchResult>;
    lookup(parameters: CatalogLookupParameters): SingleRequestHandle<CatalogLookupResult>;
    latest<const B extends SnapshotBlockName>(parameters: LatestParameters<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestBatched<const B extends SnapshotBlockName>(parameters: LatestParameters<B>): RequestHandle<MarketDataBatch<B>>;
    latestStream<const B extends StreamBlockName>(parameters: LatestStreamParameters<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestStreamBatched<const B extends StreamBlockName>(parameters: LatestStreamParameters<B>): RequestHandle<MarketDataBatch<B>>;
    timeseries<const B extends TsRawBlockName>(parameters: TsRawParameters<B>): RequestHandle<MarketDataMessage<B>>;
    timeseriesBatched<const B extends TsRawBlockName>(parameters: TsRawParameters<B>): RequestHandle<MarketDataBatch<B>>;
}
export type DatasetNamespace = {
    readonly [Alias in keyof typeof DATASETS]: DatasetClient<(typeof DATASETS)[Alias]>;
} & {
    get<C extends string>(dataset: C): DatasetClient<C>;
};
export interface SelectedClient {
    read<const D extends readonly CatalogFieldDescriptor[]>(parameters?: SelectedReadParameters<D>): RequestHandle<DatasetRecord<string, CatalogDescriptorSelection<D>>>;
    latest<const B extends SnapshotBlockName>(parameters?: Omit<LatestParameters<B>, "selector">): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestBatched<const B extends SnapshotBlockName>(parameters?: Omit<LatestParameters<B>, "selector">): RequestHandle<MarketDataBatch<B>>;
    latestStream<const B extends StreamBlockName>(parameters?: Omit<LatestStreamParameters<B>, "selector">): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestStreamBatched<const B extends StreamBlockName>(parameters?: Omit<LatestStreamParameters<B>, "selector">): RequestHandle<MarketDataBatch<B>>;
    timeseries<const B extends TsRawBlockName>(parameters: Omit<TsRawParameters<B>, "selector">): RequestHandle<MarketDataMessage<B>>;
    timeseriesBatched<const B extends TsRawBlockName>(parameters: Omit<TsRawParameters<B>, "selector">): RequestHandle<MarketDataBatch<B>>;
}
export interface MultiSelectedClient {
    read<const D extends readonly CatalogFieldDescriptor[]>(parameters?: SelectedReadParameters<D>): MultiRequestHandle<DatasetRecord<string, CatalogDescriptorSelection<D>>>;
    latest<const B extends SnapshotBlockName>(parameters?: Omit<LatestParameters<B>, "selector">): MultiRequestHandle<ResolvedMarketDataMessage<B>>;
    latestBatched<const B extends SnapshotBlockName>(parameters?: Omit<LatestParameters<B>, "selector">): MultiRequestHandle<MarketDataBatch<B>>;
    latestStream<const B extends StreamBlockName>(parameters?: Omit<LatestStreamParameters<B>, "selector">): MultiRequestHandle<ResolvedMarketDataMessage<B>>;
    latestStreamBatched<const B extends StreamBlockName>(parameters?: Omit<LatestStreamParameters<B>, "selector">): MultiRequestHandle<MarketDataBatch<B>>;
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
    catalogLookup(catalog: string, parameters: CatalogLookupParameters): SingleRequestHandle<CatalogLookupResult>;
    catalogSearch(catalog: string, parameters?: CatalogSearchParameters): SingleRequestHandle<CatalogSearchResult>;
    streamMetadata(parameters: StreamMetadataParameters): RequestHandle<StreamMetadata>;
    catalog_keyfigures<C extends KeyfiguresCatalog>(catalog: C): CatalogKeyfigures<C>;
    latest<const B extends SnapshotBlockName>(parameters: LatestParameters<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestBatched<const B extends SnapshotBlockName>(parameters: LatestParameters<B>): RequestHandle<MarketDataBatch<B>>;
    latestStream<const B extends StreamBlockName>(parameters: LatestStreamParameters<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestStreamBatched<const B extends StreamBlockName>(parameters: LatestStreamParameters<B>): RequestHandle<MarketDataBatch<B>>;
    tsRaw<const B extends TsRawBlockName>(parameters: TsRawParameters<B>): RequestHandle<MarketDataMessage<B>>;
    tsRawBatched<const B extends TsRawBlockName>(parameters: TsRawParameters<B>): RequestHandle<MarketDataBatch<B>>;
    tsCandle<const B extends TsCandleBlockName>(parameters: TsCandleParameters<B>): RequestHandle<MarketDataMessage<B>>;
    tsCandleBatched<const B extends TsCandleBlockName>(parameters: TsCandleParameters<B>): RequestHandle<MarketDataBatch<B>>;
    tsRawStream<const B extends TsRawStreamBlockName>(parameters: TsRawStreamParameters<B>): RequestHandle<MarketDataMessage<B>>;
    tsRawStreamBatched<const B extends TsRawStreamBlockName>(parameters: TsRawStreamParameters<B>): RequestHandle<MarketDataBatch<B>>;
    tsCandleStream<const B extends TsCandleStreamBlockName>(parameters: TsCandleStreamParameters<B>): RequestHandle<MarketDataMessage<B>>;
    tsCandleStreamBatched<const B extends TsCandleStreamBlockName>(parameters: TsCandleStreamParameters<B>): RequestHandle<MarketDataBatch<B>>;
    catalog<const C extends CatalogName, const F extends readonly CatalogFieldName<C>[]>(parameters: CatalogParameters<C, F>): RequestHandle<DatasetRecord<C, CatalogParameterValues<C, F>>>;
    catalog<const C extends string, const D extends readonly CatalogFieldDescriptor[]>(parameters: CatalogDescriptorParameters<C, D>): RequestHandle<DatasetRecord<C, CatalogDescriptorValues<C, D>>>;
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
    get dataset(): DatasetNamespace;
    select(selector: MarketSelector): SelectedClient;
    select(selectors: readonly [MarketSelector, ...MarketSelector[]]): MultiSelectedClient;
    latest<const B extends SnapshotBlockName>(parameters: LatestParameters<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestBatched<const B extends SnapshotBlockName>(parameters: LatestParameters<B>): RequestHandle<MarketDataBatch<B>>;
    latestStream<const B extends StreamBlockName>(parameters: LatestStreamParameters<B>): RequestHandle<ResolvedMarketDataMessage<B>>;
    latestStreamBatched<const B extends StreamBlockName>(parameters: LatestStreamParameters<B>): RequestHandle<MarketDataBatch<B>>;
    tsRaw<const B extends TsRawBlockName>(parameters: TsRawParameters<B>): RequestHandle<MarketDataMessage<B>>;
    tsRawBatched<const B extends TsRawBlockName>(parameters: TsRawParameters<B>): RequestHandle<MarketDataBatch<B>>;
    tsCandle<const B extends TsCandleBlockName>(parameters: TsCandleParameters<B>): RequestHandle<MarketDataMessage<B>>;
    tsCandleBatched<const B extends TsCandleBlockName>(parameters: TsCandleParameters<B>): RequestHandle<MarketDataBatch<B>>;
    tsRawStream<const B extends TsRawStreamBlockName>(parameters: TsRawStreamParameters<B>): RequestHandle<MarketDataMessage<B>>;
    tsRawStreamBatched<const B extends TsRawStreamBlockName>(parameters: TsRawStreamParameters<B>): RequestHandle<MarketDataBatch<B>>;
    tsCandleStream<const B extends TsCandleStreamBlockName>(parameters: TsCandleStreamParameters<B>): RequestHandle<MarketDataMessage<B>>;
    tsCandleStreamBatched<const B extends TsCandleStreamBlockName>(parameters: TsCandleStreamParameters<B>): RequestHandle<MarketDataBatch<B>>;
    catalog<const C extends CatalogName, const F extends readonly CatalogFieldName<C>[]>(parameters: CatalogParameters<C, F>): RequestHandle<DatasetRecord<C, CatalogParameterValues<C, F>>>;
    catalog<const C extends string, const D extends readonly CatalogFieldDescriptor[]>(parameters: CatalogDescriptorParameters<C, D>): RequestHandle<DatasetRecord<C, CatalogDescriptorValues<C, D>>>;
    catalog_keyfigures<C extends KeyfiguresCatalog>(catalog: C): CatalogKeyfigures<C>;
    close(): Promise<void>;
    catalogSearch(catalog: string, parameters?: CatalogSearchParameters): SingleRequestHandle<CatalogSearchResult>;
    catalogLookup(catalog: string, parameters: CatalogLookupParameters): SingleRequestHandle<CatalogLookupResult>;
    sourceProgress(parameters: Omit<ListingSelector, "key" | "blocks" | "progressOnly">): RequestHandle<ListingEvent>;
    listingLatest(parameters: ListingSelector & {
        readonly trace?: TraceContext;
    }): RequestHandle<ListingEvent>;
    streamMetadata(parameters: StreamMetadataParameters): RequestHandle<StreamMetadata>;
}
export {};
//# sourceMappingURL=connection.d.ts.map