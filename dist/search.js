import { ProtocolError } from "./protocol.js";
export function decodeFacets(payload) {
    const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
    if (!isObject(payload) || !isObject(payload.facets) || !isObject(payload.facet_meta))
        throw new ProtocolError("facet result required");
    for (const [field, values] of Object.entries(payload.facets)) {
        if (!isObject(values) || Object.values(values).some(n => typeof n !== "number" || !Number.isSafeInteger(n) || n < 0))
            throw new ProtocolError("invalid facet count");
        const meta = payload.facet_meta[field];
        if (!isObject(meta) || typeof meta.exhaustive !== "boolean")
            throw new ProtocolError("invalid facet metadata");
    }
    return { facets: payload.facets, facet_meta: payload.facet_meta };
}
export function decodeCatalogSearch(payload) {
    const facets = decodeFacets(payload), value = payload;
    if (!Array.isArray(value.fields) || typeof value.state !== "string" || !Array.isArray(value.entries) || (value.next_cursor !== null && typeof value.next_cursor !== "string")
        || (value.total !== null && (typeof value.total !== "number" || !Number.isSafeInteger(value.total) || value.total < 0))
        || (value.indexed_at_millis !== null && (typeof value.indexed_at_millis !== "number" || !Number.isSafeInteger(value.indexed_at_millis)))
        || !value.config || typeof value.config !== "object")
        throw new ProtocolError("invalid Catalog search page");
    for (const entry of value.entries) {
        if (!entry || typeof entry !== "object" || typeof entry.key !== "string" || !Array.isArray(entry.text) || entry.text.some((v) => typeof v !== "string")
            || !entry.facets || typeof entry.facets !== "object" || Object.values(entry.facets).some(v => typeof v !== "string")
            || !entry.numbers || typeof entry.numbers !== "object" || Object.values(entry.numbers).some(v => typeof v !== "number" || !Number.isFinite(v)))
            throw new ProtocolError("invalid Catalog search entry");
    }
    const config = value.config;
    if (!Array.isArray(config.facets) || !Array.isArray(config.ranges) || typeof config.max_facet_values !== "number")
        throw new ProtocolError("invalid Catalog search configuration");
    return { ...value, ...facets };
}
//# sourceMappingURL=search.js.map