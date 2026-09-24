import { ProtocolError } from "./protocol.js";
export function decodeCatalogLookup(payload) {
    const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
    const strings = (v) => Array.isArray(v) && v.every(x => typeof x === "string");
    if (!object(payload) || typeof payload.catalog !== "string" || (payload.dataset_record_type !== null && typeof payload.dataset_record_type !== "string")
        || !Array.isArray(payload.entries) || !strings(payload.dimensions) || (payload.next_cursor !== null && typeof payload.next_cursor !== "string"))
        throw new ProtocolError("invalid Dataset lookup page");
    for (const entry of payload.entries) {
        if (!object(entry) || typeof entry.key !== "string" || !object(entry.dimensions) || !Object.values(entry.dimensions).every(strings))
            throw new ProtocolError("invalid Catalog lookup record");
    }
    return payload;
}
//# sourceMappingURL=lookup.js.map