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
export type CatalogValueOrigin = {
    readonly kind: "import";
    readonly dataset: string;
    readonly generation: bigint;
    readonly incarnation: string;
    readonly run_id: string;
} | {
    readonly kind: "manual";
    readonly dataset: string;
    readonly generation: bigint;
    readonly record_id: string;
    readonly revision: bigint;
} | {
    readonly kind: "correction";
    readonly dataset: string;
    readonly generation: bigint;
    readonly correction_id: string;
    readonly revision: bigint;
};
export interface CatalogLookupLifecycle {
    readonly listing: "Listed" | "NotListed";
    readonly activity: "Active" | "Inactive" | "Unknown" | null;
    readonly visible: boolean;
    readonly effective_time_micros: bigint;
    readonly hide_at_micros: bigint | null;
    readonly hidden_at_unix_seconds: bigint | null;
    readonly source_position: {
        readonly incarnation: bigint;
        readonly message_id: bigint;
    };
    readonly requirements: readonly (readonly number[])[];
    readonly origin_ids: readonly number[];
    readonly origins: readonly CatalogValueOrigin[];
}
export interface CatalogLookupEntry {
    readonly key: string;
    readonly dimensions: CatalogDimensions;
    readonly lifecycle: CatalogLookupLifecycle | null;
    readonly requirements: readonly (readonly number[])[];
}
export interface CatalogLookupField {
    readonly entity_type: string | null;
    readonly multiple: boolean;
    readonly label: string;
    readonly semantic: string | null;
    readonly wire_id: number;
    readonly fixed_length: number | null;
}
export interface CatalogLookupStreamField {
    readonly semantic: string;
    readonly id: number;
    readonly compatible_growth: boolean;
    readonly fixed_length: number | null;
}
export interface CatalogLookupResult {
    readonly catalog: string;
    readonly dataset_record_type: string | null;
    readonly dimensions: readonly string[];
    readonly generation: bigint;
    readonly incarnation: string;
    readonly entries: readonly CatalogLookupEntry[];
    readonly fields: readonly CatalogLookupField[];
    readonly stream_fields: readonly CatalogLookupStreamField[];
    readonly stream_fields_error: string | null;
    readonly next_cursor: string | null;
    readonly scanned: number;
}
export declare function decodeCatalogLookup(frame: Uint8Array): CatalogLookupResult;
//# sourceMappingURL=lookup.d.ts.map