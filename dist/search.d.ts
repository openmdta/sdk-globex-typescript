import type { TraceContext } from "./connection.js";
export interface NumericRange<F extends string = string> {
    readonly field: F;
    readonly gt?: number;
    readonly ge?: number;
    readonly lt?: number;
    readonly le?: number;
}
/** JSON facet results used by the separate Keyfigures API. */
export interface FacetResults {
    readonly facets: Readonly<Record<string, Readonly<Record<string, number>>>>;
    readonly facet_meta: Readonly<Record<string, {
        readonly exhaustive: boolean;
    }>>;
}
export interface CatalogSearchParameters {
    readonly expression?: string;
    readonly text?: string;
    readonly filters?: Readonly<Record<string, string | readonly string[]>>;
    readonly ranges?: readonly NumericRange[];
    readonly facets?: readonly string[];
    readonly keys?: readonly string[] | null;
    readonly expected_incarnation?: string;
    readonly cursor?: string;
    readonly limit?: number;
    readonly autocomplete?: boolean;
    readonly describe?: boolean;
    readonly trace?: TraceContext;
}
export interface CatalogSearchSelector {
    readonly field: string;
    readonly member: string;
}
export interface CatalogSearchFacetConfig extends CatalogSearchSelector {
    readonly name: string;
    readonly precedence: readonly string[];
}
export interface CatalogSearchCheckpoint {
    readonly dataset: string;
    readonly generation: bigint;
    readonly incarnation_id: string | null;
    readonly universe_fingerprint: bigint;
    readonly wal_id: bigint;
    readonly max_sequence: bigint;
}
export interface CatalogSearchPage {
    readonly state: "building" | "ready";
    readonly fields: readonly {
        readonly name: string;
        readonly type: "string" | "number";
        readonly facet: boolean;
        readonly operators: readonly string[];
        readonly selector: CatalogSearchSelector;
    }[];
    readonly entries: readonly {
        readonly key: string;
        readonly text: readonly string[];
        readonly facets: Readonly<Record<string, string>>;
        readonly numbers: Readonly<Record<string, number>>;
    }[];
    readonly total: bigint | null;
    readonly facets: Readonly<Record<string, Readonly<Record<string, bigint>>>>;
    readonly facet_meta: Readonly<Record<string, {
        readonly exhaustive: boolean;
    }>>;
    readonly next_cursor: string | null;
    readonly indexed_at_millis: bigint | null;
    readonly checkpoint: CatalogSearchCheckpoint | null;
    readonly indexed_records: bigint;
    readonly processed_records: bigint;
    readonly config: {
        readonly exposure_approved: boolean;
        readonly text: readonly CatalogSearchSelector[];
        readonly facets: readonly CatalogSearchFacetConfig[];
        readonly ranges: readonly CatalogSearchFacetConfig[];
        readonly max_facet_values: number;
        readonly boost: CatalogSearchSelector | null;
        readonly ranking: {
            readonly mode: "ordered";
            readonly factors: readonly ("match" | "class" | "boost")[];
        } | {
            readonly mode: "weighted";
            readonly relevance: number;
            readonly class: number;
            readonly boost: number;
        };
        readonly refresh_seconds: bigint;
    };
    readonly error: string | null;
    readonly elapsed_ms: number;
}
export type CatalogSearchResult = {
    readonly state: "disabled";
} | CatalogSearchPage;
export declare function decodeFacets(payload: unknown): FacetResults;
export declare function decodeCatalogSearch(frame: Uint8Array): CatalogSearchResult;
//# sourceMappingURL=search.d.ts.map