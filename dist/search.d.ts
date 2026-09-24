import type { TraceContext } from "./connection.js";
export interface NumericRange<F extends string = string> {
    readonly field: F;
    readonly gt?: number;
    readonly ge?: number;
    readonly lt?: number;
    readonly le?: number;
}
export interface FacetResults {
    readonly facets: Readonly<Record<string, Readonly<Record<string, number>>>>;
    readonly facet_meta: Readonly<Record<string, {
        readonly exhaustive: boolean;
    }>>;
}
export interface CatalogSearchParameters {
    readonly expression?: string;
    readonly text?: string;
    readonly filters?: Readonly<Record<string, readonly string[]>>;
    readonly ranges?: readonly NumericRange[];
    readonly facets?: readonly string[];
    readonly cursor?: string;
    readonly limit?: number;
    readonly autocomplete?: boolean;
    readonly describe?: boolean;
    readonly trace?: TraceContext;
}
export interface CatalogSearchResult extends FacetResults {
    readonly fields: readonly {
        readonly name: string;
        readonly type: "string" | "number";
        readonly facet: boolean;
        readonly operators: readonly string[];
    }[];
    readonly state: string;
    readonly entries: readonly {
        readonly key: string;
        readonly text: readonly string[];
        readonly facets: Readonly<Record<string, string>>;
        readonly numbers: Readonly<Record<string, number>>;
    }[];
    readonly total: number | null;
    readonly next_cursor: string | null;
    readonly indexed_at_millis: number | null;
    readonly config: {
        readonly facets: readonly {
            readonly name: string;
            readonly field: string;
            readonly member: string;
            readonly precedence: readonly string[];
        }[];
        readonly ranges: readonly {
            readonly name: string;
            readonly field: string;
            readonly member: string;
        }[];
        readonly max_facet_values: number;
    };
}
export declare function decodeFacets(payload: unknown): FacetResults;
export declare function decodeCatalogSearch(payload: unknown): CatalogSearchResult;
//# sourceMappingURL=search.d.ts.map