import type { CatalogDescriptorSelection, CatalogFieldDescriptor } from "./catalog.js";
import type { Connection, DatasetReadOptions, DatasetRecord } from "./connection.js";
import type { MarketDataFields, StreamBlockName } from "./generated/bindings.js";
import type { MarketDataDatasetRecord } from "./protocol.js";
import { DATASETS, DATASET_CAPABILITIES } from "./generated/datasets.js";
import { type MarketSelector } from "./selector.js";
export interface ExternalStoreOptions {
    /** Keep an unused upstream subscription warm for quick component reselection. */
    readonly unsubscribeGraceMillis?: number;
    /** Reuse finite Dataset reads without retaining an upstream subscription. */
    readonly catalogExpiryMillis?: number;
}
export interface CachedDatasetClient<C extends string> {
    readonly id: C;
    read<const D extends readonly CatalogFieldDescriptor[]>(selector: MarketSelector, options?: DatasetReadOptions<D>): Promise<readonly DatasetRecord<C, CatalogDescriptorSelection<D>>[]>;
}
export type CachedDatasetNamespace = {
    readonly [Alias in keyof typeof DATASETS as "catalog" extends (typeof DATASET_CAPABILITIES)[Alias][number] ? Alias : never]: CachedDatasetClient<(typeof DATASETS)[Alias]>;
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
export declare class MarketDataExternalStore {
    #private;
    private readonly connection;
    constructor(connection: Connection, options?: ExternalStoreOptions);
    get dataset(): CachedDatasetNamespace;
    latestStream<const N extends StreamBlockName>(selector: MarketSelector, blocks?: readonly N[]): ExternalSelection<N>;
}
export declare const createExternalStore: (connection: Connection, options?: ExternalStoreOptions) => MarketDataExternalStore;
//# sourceMappingURL=external-store.d.ts.map