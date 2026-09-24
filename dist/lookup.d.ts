import type { TraceContext } from "./connection.js";
export type CatalogDimensions = Readonly<Record<string, readonly string[]>>;
export interface DatasetRecordReference {
    readonly dataset: string;
    readonly dataset_record_key: string;
}
export type CatalogLookupParameters = ({
    readonly expression: string;
    readonly dimensions?: never;
} | {
    readonly dimensions: CatalogDimensions;
    readonly expression?: never;
}) & {
    readonly cursor?: string;
    readonly limit?: number;
    readonly trace?: TraceContext;
};
export interface CatalogLookupResult {
    readonly catalog: string;
    readonly dataset_record_type: string | null;
    readonly dimensions: readonly string[];
    readonly entries: readonly {
        readonly key: string;
        readonly dimensions: CatalogDimensions;
    }[];
    readonly next_cursor: string | null;
}
export declare function decodeCatalogLookup(payload: unknown): CatalogLookupResult;
//# sourceMappingURL=lookup.d.ts.map