import { ProtocolError } from "./protocol.js";
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
  readonly facet_meta: Readonly<Record<string, {readonly exhaustive: boolean}>>;
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
  readonly fields: readonly {readonly name: string; readonly type: "string" | "number"; readonly facet: boolean; readonly operators: readonly string[]}[];
  readonly state: string;
  readonly entries: readonly {readonly key: string; readonly text: readonly string[]; readonly facets: Readonly<Record<string,string>>; readonly numbers: Readonly<Record<string,number>>}[];
  readonly total: number | null;
  readonly next_cursor: string | null;
  readonly indexed_at_millis: number | null;
  readonly config: {
    readonly facets: readonly {readonly name: string; readonly field: string; readonly member: string; readonly precedence: readonly string[]}[];
    readonly ranges: readonly {readonly name: string; readonly field: string; readonly member: string}[];
    readonly max_facet_values: number;
  };
}
export function decodeFacets(payload: unknown): FacetResults {
  const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
  if (!isObject(payload) || !isObject(payload.facets) || !isObject(payload.facet_meta)) throw new ProtocolError("facet result required");
  for (const [field, values] of Object.entries(payload.facets)) {
    if (!isObject(values) || Object.values(values).some(n => typeof n !== "number" || !Number.isSafeInteger(n) || n < 0)) throw new ProtocolError("invalid facet count");
    const meta = payload.facet_meta[field];
    if (!isObject(meta) || typeof meta.exhaustive !== "boolean") throw new ProtocolError("invalid facet metadata");
  }
  return {facets: payload.facets, facet_meta: payload.facet_meta} as FacetResults;
}
export function decodeCatalogSearch(payload: unknown): CatalogSearchResult {
  const facets = decodeFacets(payload), value = payload as Record<string,unknown>;
  if (!Array.isArray(value.fields) || typeof value.state !== "string" || !Array.isArray(value.entries) || (value.next_cursor !== null && typeof value.next_cursor !== "string")
    || (value.total !== null && (typeof value.total !== "number" || !Number.isSafeInteger(value.total) || value.total < 0))
    || (value.indexed_at_millis !== null && (typeof value.indexed_at_millis !== "number" || !Number.isSafeInteger(value.indexed_at_millis)))
    || !value.config || typeof value.config !== "object") throw new ProtocolError("invalid Catalog search page");
  for (const entry of value.entries) {
    if (!entry || typeof entry !== "object" || typeof entry.key !== "string" || !Array.isArray(entry.text) || entry.text.some((v: unknown) => typeof v !== "string")
      || !entry.facets || typeof entry.facets !== "object" || Object.values(entry.facets).some(v => typeof v !== "string")
      || !entry.numbers || typeof entry.numbers !== "object" || Object.values(entry.numbers).some(v => typeof v !== "number" || !Number.isFinite(v))) throw new ProtocolError("invalid Catalog search entry");
  }
  const config = value.config as Record<string,unknown>;
  if (!Array.isArray(config.facets) || !Array.isArray(config.ranges) || typeof config.max_facet_values !== "number") throw new ProtocolError("invalid Catalog search configuration");
  return {...value,...facets} as unknown as CatalogSearchResult;
}
