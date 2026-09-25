import { type FacetResults } from "./search.js";
import { KEYFIGURES_CONTRACTS } from "./generated/keyfigures.js";
import type { RequestHandle, TraceContext } from "./connection.js";
export { KEYFIGURES_CONTRACTS };
export type KeyfiguresCatalog = keyof typeof KEYFIGURES_CONTRACTS;
interface RuntimeContract {
    readonly fingerprint: string;
    readonly fields: readonly {
        readonly name: string;
        readonly type: string;
        readonly nullable: boolean;
    }[];
    readonly blocks: readonly {
        readonly semantic: string;
        readonly projection: Readonly<Record<string, string>>;
        readonly members: Readonly<Record<string, {
            readonly type: string;
        }>>;
    }[];
}
type Contract<C extends KeyfiguresCatalog> = [C] extends [never] ? RuntimeContract : typeof KEYFIGURES_CONTRACTS[C];
type Field<C extends KeyfiguresCatalog> = Contract<C>["fields"][number];
type FieldNames<C extends KeyfiguresCatalog, P> = Extract<Field<C>, P>["name"];
type Scalar<F> = F extends {
    type: "number" | "integer";
} ? number : F extends {
    type: "boolean";
} ? boolean : string;
type NullableScalar<F> = Scalar<F> | (F extends {
    nullable: true;
} ? null : never);
export type KeyfiguresFields<C extends KeyfiguresCatalog> = {
    readonly [F in Field<C> as F["name"]]: NullableScalar<F>;
};
export type KeyfiguresBlocks<C extends KeyfiguresCatalog> = {
    readonly [B in Contract<C>["blocks"][number] as B["semantic"]]: {
        readonly [M in keyof B["members"]]: Scalar<B["members"][M]>;
    } | null;
};
export interface KeyfiguresPolicy {
    readonly price_cutoff_ms?: number;
    readonly price_age_mode?: "elapsed" | "trading-time" | "last-completed-session";
    readonly trace?: TraceContext;
}
export interface KeyfiguresSearchParameters<C extends KeyfiguresCatalog> extends KeyfiguresPolicy {
    readonly expression?: string;
    readonly cursor?: string;
    readonly facets?: readonly FieldNames<C, {
        facet: true;
    }>[];
    readonly text?: string;
    readonly filters?: Partial<Record<FieldNames<C, {
        filter: "equals";
    }>, readonly string[]>>;
    readonly ranges?: readonly {
        readonly field: FieldNames<C, {
            filter: "range";
        }>;
        readonly gt?: number;
        readonly ge?: number;
        readonly lt?: number;
        readonly le?: number;
        readonly min?: number;
        readonly max?: number;
        readonly absolute_margin?: number;
        readonly relative_margin?: number;
    }[];
    readonly sorts?: readonly {
        readonly field: FieldNames<C, {
            sort: true;
        }>;
        readonly descending?: boolean;
    }[];
    readonly offset?: number;
    readonly limit?: number;
    readonly budget?: number;
}
export interface KeyfiguresRequirements {
    readonly clauses: readonly ("Public" | {
        readonly AnyOf: readonly {
            readonly namespace: string;
            readonly license: string;
        }[];
    })[];
}
export interface KeyfiguresPriceProvenance {
    readonly cutoff_us: number;
    readonly price_cutoff_ms: number;
    readonly price_age_mode: "elapsed" | "trading-time" | "last-completed-session";
    readonly quote_event_us: number;
    readonly message_id: number;
    readonly input: string;
    readonly catalog: string;
    readonly key: string;
    readonly quality: string;
    readonly clock: "live" | "replay";
    readonly fallback: readonly {
        readonly input: string;
        readonly reason: string;
    }[];
}
export interface KeyfiguresRow<C extends KeyfiguresCatalog> {
    readonly fields: KeyfiguresFields<C>;
    readonly blocks: KeyfiguresBlocks<C>;
    readonly observation: {
        readonly event_us: bigint | null;
        readonly message_id: bigint | null;
        readonly source: KeyfiguresPriceProvenance | null;
        readonly dependencies: readonly KeyfiguresPriceProvenance[];
        readonly reason: string | null;
        readonly requirements: KeyfiguresRequirements;
    };
}
export interface KeyfiguresResult<C extends KeyfiguresCatalog> {
    readonly catalog: C;
    readonly epoch: bigint;
    readonly clock: "live" | "replay";
    readonly price_cutoff_ms: number;
    readonly price_age_mode: "elapsed" | "trading-time" | "last-completed-session";
    readonly contract_fingerprint: string;
}
export interface KeyfiguresSearchResult<C extends KeyfiguresCatalog> extends KeyfiguresResult<C>, FacetResults {
    readonly next_cursor: string | null;
    readonly snapshot_cutoff_us: number | null;
    readonly live_cutoff_us: number | null;
    readonly facet_basis: "snapshot_exact";
    /** Each cursor advances through fixed snapshot windows. Every window is freshly reranked; pages are not one global live order. */
    readonly ordering: "snapshot_windows_live_reranked_best_effort";
    readonly rows: readonly KeyfiguresRow<C>[];
    readonly snapshot_matches: number;
    readonly candidates: number;
    readonly candidate_budget_exhausted: boolean;
    readonly underfilled: boolean;
}
export interface KeyfiguresInstrumentResult<C extends KeyfiguresCatalog> extends KeyfiguresResult<C> {
    readonly result: KeyfiguresRow<C>;
}
export interface KeyfiguresSchema<C extends KeyfiguresCatalog> {
    readonly contract: Contract<C>;
    readonly fields: readonly (Omit<Field<C>, "facet"> & {
        readonly facet: boolean;
        readonly operators: readonly string[];
    })[];
    readonly clock: "live" | "replay";
    readonly limits: {
        readonly facets: readonly {
            readonly name: string;
            readonly precedence: readonly string[];
        }[];
        readonly maxFacetValues: number;
        readonly priceCutoffMs: number;
        readonly maxRequestPriceCutoffMs: number;
        readonly allowNoPriceCutoff: boolean;
        readonly query: {
            readonly maxPage: number;
            readonly maxCandidates: number;
            readonly maxOffset: number;
        };
    };
}
export interface SingleRequestHandle<T> extends RequestHandle<T> {
    /** Resolve the one result after the server completes the request. */
    await(): Promise<T>;
}
export interface CatalogKeyfigures<C extends KeyfiguresCatalog> {
    search(parameters?: KeyfiguresSearchParameters<C>): SingleRequestHandle<KeyfiguresSearchResult<C>>;
    instrument(key: string, policy?: KeyfiguresPolicy): SingleRequestHandle<KeyfiguresInstrumentResult<C>>;
    schema(): SingleRequestHandle<KeyfiguresSchema<C>>;
}
/** Validate the actual response against the generated universe projection before exposing its types. */
export declare function decodeKeyfigures<C extends KeyfiguresCatalog>(catalog: C, action: "search" | "instrument" | "schema", payload: unknown): KeyfiguresSearchResult<C> | KeyfiguresInstrumentResult<C> | KeyfiguresSchema<C>;
//# sourceMappingURL=keyfigures.d.ts.map