import type { CatalogLifecycle, CatalogWireField } from "./protocol.js";
/** Opaque Catalog incarnation and WAL position. Persist it only after its rows. */
export type CatalogFeedState = string;
export interface CatalogFeedRecord {
    readonly catalog: string;
    readonly recordKey: string;
    readonly phase: "SNAPSHOT" | "UPDATE";
    readonly exists: boolean;
    readonly lifecycle: CatalogLifecycle | null;
    readonly fields: Readonly<Record<string, unknown>>;
    readonly rawFields: readonly CatalogWireField[];
}
export type CatalogFeedControl = {
    readonly kind: "reset";
} | {
    readonly kind: "snapshotBegin";
} | {
    readonly kind: "snapshotComplete";
    readonly state: CatalogFeedState;
} | {
    readonly kind: "cursor";
    readonly state: CatalogFeedState;
};
export interface CatalogFeedWrite<RecordType extends CatalogFeedRecord = CatalogFeedRecord> {
    readonly records: readonly RecordType[];
    readonly control?: CatalogFeedControl;
}
/** A durable sink stages snapshot rows and swaps them on snapshotComplete. */
export interface CatalogFeedSink<RecordType extends CatalogFeedRecord = CatalogFeedRecord> {
    resume(): Promise<CatalogFeedState | null>;
    write(batch: CatalogFeedWrite<RecordType>): Promise<void>;
}
export declare class MemoryCatalogFeedSink<RecordType extends CatalogFeedRecord = CatalogFeedRecord> implements CatalogFeedSink<RecordType> {
    #private;
    readonly onWrite?: ((batch: CatalogFeedWrite<RecordType>) => void) | undefined;
    readonly records: Map<string, RecordType>;
    constructor(onWrite?: ((batch: CatalogFeedWrite<RecordType>) => void) | undefined);
    resume(): Promise<CatalogFeedState | null>;
    write(batch: CatalogFeedWrite<RecordType>): Promise<void>;
}
//# sourceMappingURL=catalog-feed.d.ts.map