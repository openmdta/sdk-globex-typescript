import {decodeFacets, type FacetResults} from "./search.js";
import { KEYFIGURES_CONTRACTS } from "./generated/keyfigures.js";
import { ProtocolError } from "./protocol.js";
import type { RequestHandle, TraceContext } from "./connection.js";

export { KEYFIGURES_CONTRACTS };
export type KeyfiguresCatalog = keyof typeof KEYFIGURES_CONTRACTS;
type Contract<C extends KeyfiguresCatalog> = typeof KEYFIGURES_CONTRACTS[C];
type Field<C extends KeyfiguresCatalog> = Contract<C>["fields"][number];
type FieldNames<C extends KeyfiguresCatalog, P> = Extract<Field<C>, P>["name"];
type Scalar<F> = F extends {type: "number" | "integer"} ? number : F extends {type: "boolean"} ? boolean : string;
type NullableScalar<F> = Scalar<F> | (F extends {nullable: true} ? null : never);
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
  readonly facets?: readonly FieldNames<C, {facet: true}>[];
  readonly text?: string;
  readonly filters?: Partial<Record<FieldNames<C, {filter: "equals"}>, readonly string[]>>;
  readonly ranges?: readonly {
    readonly field: FieldNames<C, {filter: "range"}>;
    readonly gt?: number;
    readonly ge?: number;
    readonly lt?: number;
    readonly le?: number;
    readonly min?: number;
    readonly max?: number;
    readonly absolute_margin?: number;
    readonly relative_margin?: number;
  }[];
  readonly sorts?: readonly {readonly field: FieldNames<C, {sort: true}>; readonly descending?: boolean}[];
  readonly offset?: number;
  readonly limit?: number;
  readonly budget?: number;
}
export interface KeyfiguresRequirements {
  readonly clauses: readonly ("Public" | {readonly AnyOf: readonly {readonly namespace: string; readonly license: string}[]})[];
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
  readonly fallback: readonly {readonly input: string; readonly reason: string}[];
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
  readonly fields: readonly (Omit<Field<C>, "facet"> & {readonly facet: boolean; readonly operators: readonly string[]})[];
  readonly clock: "live" | "replay";
  readonly limits: {
    readonly facets: readonly {readonly name: string; readonly precedence: readonly string[]}[];
    readonly maxFacetValues: number;
    readonly priceCutoffMs: number;
    readonly maxRequestPriceCutoffMs: number;
    readonly allowNoPriceCutoff: boolean;
    readonly query: {readonly maxPage: number; readonly maxCandidates: number; readonly maxOffset: number};
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

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProtocolError("keyfigures object required");
  return value as Record<string, unknown>;
}
function uint64(value: unknown): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) throw new ProtocolError("keyfigures uint64 string required");
  const result = BigInt(value);
  if (result > 0xffffffffffffffffn) throw new ProtocolError("keyfigures uint64 overflow");
  return result;
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new ProtocolError("keyfigures unsigned integer required");
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new ProtocolError("keyfigures boolean required");
  return value;
}

/** Validate the actual response against the generated universe projection before exposing its types. */
export function decodeKeyfigures<C extends KeyfiguresCatalog>(catalog: C, action: "search" | "instrument" | "schema", payload: unknown): KeyfiguresSearchResult<C> | KeyfiguresInstrumentResult<C> | KeyfiguresSchema<C> {
  const value = object(payload), contract = KEYFIGURES_CONTRACTS[catalog];
  if (value.contract_fingerprint !== contract.fingerprint) throw new ProtocolError("keyfigures contract mismatch; regenerate SDK");
  if (value.clock !== "live" && value.clock !== "replay") throw new ProtocolError("invalid keyfigures clock");
  if (action === "schema") {
    const schema = object(value.contract), limits = object(value.limits), query = object(limits.query);
    if (schema.fingerprint !== contract.fingerprint || schema.catalog !== catalog) throw new ProtocolError("wrong keyfigures schema");
    if (!Array.isArray(value.fields) || value.fields.length !== contract.fields.length) throw new ProtocolError("runtime field capabilities required");
    const fields = value.fields.map(item => {
      const field = object(item);
      if (!contract.fields.some(f => f.name === field.name && f.type === field.type) || typeof field.facet !== "boolean" || !Array.isArray(field.operators) || field.operators.some(op => typeof op !== "string")) throw new ProtocolError("invalid runtime field capabilities");
      return field;
    }) as unknown as KeyfiguresSchema<C>["fields"];
    if (new Set(fields.map(field => field.name)).size !== contract.fields.length) throw new ProtocolError("duplicate runtime fields");
    if (!Array.isArray(limits.facets) || limits.facets.some(item => {
      const facet = object(item); return typeof facet.name !== "string" || !Array.isArray(facet.precedence) || facet.precedence.some(value => typeof value !== "string");
    })) throw new ProtocolError("invalid facet configuration");
    return {contract, fields, clock: value.clock, limits: {facets: limits.facets as KeyfiguresSchema<C>["limits"]["facets"], maxFacetValues: count(limits.maxFacetValues), priceCutoffMs: count(limits.priceCutoffMs), maxRequestPriceCutoffMs: count(limits.maxRequestPriceCutoffMs), allowNoPriceCutoff: boolean(limits.allowNoPriceCutoff), query: {maxPage: count(query.maxPage), maxCandidates: count(query.maxCandidates), maxOffset: count(query.maxOffset)}}};
  }
  if (action === "instrument" && value.catalog !== catalog) throw new ProtocolError("wrong keyfigures catalog");
  if (!["elapsed", "trading-time", "last-completed-session"].includes(String(value.price_age_mode))) throw new ProtocolError("invalid keyfigures price age mode");
  const metadata: KeyfiguresResult<C> = {catalog, epoch: uint64(value.epoch_id), clock: value.clock, price_cutoff_ms: count(value.price_cutoff_ms), price_age_mode: value.price_age_mode as KeyfiguresResult<C>["price_age_mode"], contract_fingerprint: contract.fingerprint};
  const rows = action === "instrument" ? [value.result] : value.rows;
  if (!Array.isArray(rows)) throw new ProtocolError("keyfigures rows required");
  const decoded = rows.map(item => {
    const row = object(item), fields = object(row.fields), blocks = object(row.blocks), observation = object(row.observation);
    for (const field of contract.fields) {
      const value = fields[field.name];
      if (value === null && field.nullable) continue;
      const expected = field.type === "integer" || field.type === "number" ? "number" : field.type;
      if (typeof value !== expected || (field.type === "number" && !Number.isFinite(value)) || (field.type === "integer" && !Number.isSafeInteger(value))) throw new ProtocolError(`invalid keyfigures field ${field.name}`);
    }
    for (const block of contract.blocks) {
      if (blocks[block.semantic] === null) {
        if (Object.values(block.projection).every(name => fields[name] !== null)) throw new ProtocolError("missing keyfigures block");
        continue;
      }
      const members = object(blocks[block.semantic]);
      for (const [member, field] of Object.entries(block.projection)) {
        const rawDescriptor = block.members[member as keyof typeof block.members], memberValue = members[member];
        if (!rawDescriptor) throw new ProtocolError(`unknown universe block member ${block.semantic}.${member}`);
        const descriptor = object(rawDescriptor);
        const expected = descriptor.type === "integer" || descriptor.type === "number" ? "number" : descriptor.type;
        if (memberValue === null || typeof memberValue !== expected
          || (descriptor.type === "number" && !Number.isFinite(memberValue))
          || (descriptor.type === "integer" && !Number.isSafeInteger(memberValue))
          || memberValue !== fields[field]) throw new ProtocolError(`invalid universe block ${block.semantic}.${member}`);
      }
    }
    const requirements = object(observation.requirements);
    if (!Array.isArray(requirements.clauses) || !requirements.clauses.length) throw new ProtocolError("keyfigures license requirements missing");
    for (const clause of requirements.clauses) {
      if (clause === "Public") continue;
      const alternatives = object(clause).AnyOf;
      if (!Array.isArray(alternatives) || !alternatives.length || alternatives.some(value => {
        const license = object(value); return typeof license.namespace !== "string" || !license.namespace || typeof license.license !== "string" || !license.license;
      })) throw new ProtocolError("invalid keyfigures license clause");
    }
    const sources = observation.source == null ? [] : [observation.source];
    if (!Array.isArray(observation.dependencies)) throw new ProtocolError("invalid keyfigures dependency provenance");
    sources.push(...observation.dependencies);
    for (const item of sources) {
      const source = object(item);
      if (["input", "catalog", "key"].some(name => typeof source[name] !== "string" || !source[name]) || !["RT", "DL", "EOD"].includes(String(source.quality)) || !["live", "replay"].includes(String(source.clock)) || !["elapsed", "trading-time", "last-completed-session"].includes(String(source.price_age_mode)) || !Number.isSafeInteger(source.cutoff_us) || !Number.isSafeInteger(source.price_cutoff_ms) || !Number.isSafeInteger(source.quote_event_us) || !Number.isSafeInteger(source.message_id) || !Array.isArray(source.fallback) || source.fallback.some(value => {
        const rejection = object(value); return typeof rejection.input !== "string" || typeof rejection.reason !== "string";
      })) throw new ProtocolError("invalid keyfigures price provenance");
    }
    if (observation.reason !== null && typeof observation.reason !== "string") throw new ProtocolError("invalid keyfigures availability");
    return {fields, blocks, observation: {source: observation.source ?? null, dependencies: observation.dependencies, event_us: observation.event_us === null ? null : uint64(observation.event_us), message_id: observation.message_id === null ? null : uint64(observation.message_id), reason: observation.reason, requirements}} as unknown as KeyfiguresRow<C>;
  });
  if (action === "instrument") return {...metadata, result: decoded[0]!};
  if ((value.next_cursor !== null && typeof value.next_cursor !== "string") || value.facet_basis !== "snapshot_exact" || value.ordering !== "snapshot_windows_live_reranked_best_effort") throw new ProtocolError("invalid keyfigures search metadata");
  return {...metadata, ...decodeFacets(value), next_cursor: value.next_cursor, facet_basis: value.facet_basis, ordering: value.ordering,
    snapshot_cutoff_us: value.snapshot_cutoff_us === null ? null : count(value.snapshot_cutoff_us), live_cutoff_us: value.live_cutoff_us === null ? null : count(value.live_cutoff_us), rows: decoded, snapshot_matches: count(value.snapshot_matches), candidates: count(value.candidates), candidate_budget_exhausted: boolean(value.candidate_budget_exhausted), underfilled: boolean(value.underfilled)};
}
