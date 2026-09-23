import { ProtocolError } from "./protocol.js";
import type { TraceContext } from "./connection.js";

export type CatalogDimensions = Readonly<Record<string, readonly string[]>>;
export interface DatasetRecordReference {
  readonly dataset: string;
  readonly dataset_record_key: string;
}
export type CatalogLookupParameters = ({readonly expression: string; readonly dimensions?: never}
  | {readonly dimensions: CatalogDimensions; readonly expression?: never}) & {
  readonly cursor?: string;
  readonly limit?: number;
  readonly trace?: TraceContext;
};
export interface CatalogLookupResult {
  readonly catalog: string;
  readonly dataset_record_type: string | null;
  readonly dimensions: readonly string[];
  readonly entries: readonly {readonly key: string; readonly dimensions: CatalogDimensions}[];
  readonly next_cursor: string | null;
}
export function decodeCatalogLookup(payload: unknown): CatalogLookupResult {
  const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string");
  if (!object(payload) || typeof payload.catalog !== "string" || (payload.dataset_record_type !== null && typeof payload.dataset_record_type !== "string")
    || !Array.isArray(payload.entries) || !strings(payload.dimensions) || (payload.next_cursor !== null && typeof payload.next_cursor !== "string")) throw new ProtocolError("invalid Dataset lookup page");
  for (const entry of payload.entries) {
    if (!object(entry) || typeof entry.key !== "string" || !object(entry.dimensions) || !Object.values(entry.dimensions).every(strings)) throw new ProtocolError("invalid Catalog lookup record");
  }
  return payload as unknown as CatalogLookupResult;
}
