import { ProtocolError } from "./protocol.js";
import { WireReader } from "./wire-reader.js";
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
export function decodeCatalogSearch(frame) {
    if (frame.byteLength > 8 * 1024 * 1024 + 8)
        throw new ProtocolError("Catalog search page exceeds 8 MiB");
    const reader = new WireReader(frame);
    if (reader.u16() !== 79 || reader.u16() !== 6 || reader.u16() !== 7 || reader.u16() !== 7)
        throw new ProtocolError("unsupported Catalog search page format");
    const state = reader.u8();
    const presence = reader.u8();
    const totalValue = reader.u64();
    const indexedAt = reader.u64();
    const indexed_records = reader.u64();
    const processed_records = reader.u64();
    const elapsed_ms = reader.f64();
    const max_facet_values = reader.u32();
    const refresh_seconds = reader.u64();
    const relevance = reader.f64();
    const rankingClass = reader.f64();
    const rankingBoost = reader.f64();
    const exposure = reader.u8();
    if (state > 2 || presence & ~127 || exposure > 1 || !Number.isFinite(elapsed_ms) || elapsed_ms < 0
        || (!(presence & 1) && totalValue !== 0n) || (!(presence & 4) && indexedAt !== 0n))
        throw new ProtocolError("invalid Catalog search page fields");
    const entries = [];
    const entryCount = reader.group(0);
    if (entryCount > 100)
        throw new ProtocolError("too many Catalog search entries");
    for (let i = 0; i < entryCount; i++) {
        const text = [];
        const textCount = reader.group(0);
        if (textCount > 16)
            throw new ProtocolError("too much Catalog search text");
        for (let j = 0; j < textCount; j++)
            text.push(reader.text());
        const facets = Object.create(null);
        const facetCount = reader.group(0);
        if (facetCount > 16)
            throw new ProtocolError("too many Catalog search entry facets");
        for (let j = 0; j < facetCount; j++) {
            const name = reader.text();
            if (Object.hasOwn(facets, name))
                throw new ProtocolError("duplicate Catalog search entry facet");
            facets[name] = reader.text();
        }
        const numbers = Object.create(null);
        const numberCount = reader.group(8);
        if (numberCount > 16)
            throw new ProtocolError("too many Catalog search entry numbers");
        for (let j = 0; j < numberCount; j++) {
            const value = reader.f64();
            const name = reader.text();
            if (!Number.isFinite(value) || Object.hasOwn(numbers, name))
                throw new ProtocolError("invalid Catalog search entry number");
            numbers[name] = value;
        }
        entries.push({ key: reader.text(), text, facets, numbers });
    }
    const facets = Object.create(null);
    const facetCount = reader.group(0);
    if (facetCount > 8)
        throw new ProtocolError("too many Catalog search facets");
    for (let i = 0; i < facetCount; i++) {
        const values = Object.create(null);
        const valueCount = reader.group(8);
        if (valueCount > 1000)
            throw new ProtocolError("too many Catalog search facet values");
        for (let j = 0; j < valueCount; j++) {
            const count = reader.u64();
            const value = reader.text();
            if (Object.hasOwn(values, value))
                throw new ProtocolError("duplicate Catalog search facet value");
            values[value] = count;
        }
        const name = reader.text();
        if (Object.hasOwn(facets, name))
            throw new ProtocolError("duplicate Catalog search facet");
        facets[name] = values;
    }
    const facet_meta = Object.create(null);
    const metaCount = reader.group(1);
    if (metaCount > 8)
        throw new ProtocolError("too much Catalog search facet metadata");
    for (let i = 0; i < metaCount; i++) {
        const exhaustive = reader.u8();
        const name = reader.text();
        if (exhaustive > 1 || Object.hasOwn(facet_meta, name))
            throw new ProtocolError("invalid Catalog facet metadata");
        facet_meta[name] = { exhaustive: exhaustive === 1 };
    }
    const text = [];
    const selectorCount = reader.group(0);
    if (selectorCount > 8)
        throw new ProtocolError("too many Catalog text selectors");
    for (let i = 0; i < selectorCount; i++)
        text.push({ field: reader.text(), member: reader.text() });
    const facetConfigs = [];
    const ranges = [];
    const configCount = reader.group(1);
    if (configCount > 16)
        throw new ProtocolError("too many Catalog facet configs");
    for (let i = 0; i < configCount; i++) {
        const kind = reader.u8();
        const precedence = [];
        const count = reader.group(0);
        if (count > 1000)
            throw new ProtocolError("too much Catalog facet precedence");
        for (let j = 0; j < count; j++)
            precedence.push(reader.text());
        const config = { name: reader.text(), field: reader.text(), member: reader.text(), precedence };
        if (kind === 0 && ranges.length === 0)
            facetConfigs.push(config);
        else if (kind === 1)
            ranges.push(config);
        else
            throw new ProtocolError("invalid Catalog facet kind or order");
    }
    const factors = [];
    const factorCount = reader.group(1);
    if (factorCount > 3)
        throw new ProtocolError("too many Catalog ranking factors");
    for (let i = 0; i < factorCount; i++) {
        const factor = reader.u8();
        if (factor > 2)
            throw new ProtocolError("invalid Catalog ranking factor");
        factors.push(["match", "class", "boost"][factor]);
    }
    const checkpointCount = reader.group(33);
    if (checkpointCount > 1 || Boolean(presence & 8) !== (checkpointCount === 1))
        throw new ProtocolError("invalid Catalog search checkpoint presence");
    let checkpoint = null;
    if (checkpointCount === 1) {
        const incarnationPresent = reader.u8();
        const generation = reader.u64();
        const universe_fingerprint = reader.u64();
        const wal_id = reader.u64();
        const max_sequence = reader.u64();
        const dataset = reader.text();
        const incarnation = reader.text();
        if (incarnationPresent > 1 || (incarnationPresent === 0 && incarnation !== ""))
            throw new ProtocolError("invalid Catalog checkpoint incarnation");
        checkpoint = { dataset, generation, universe_fingerprint, wal_id, max_sequence,
            incarnation_id: incarnationPresent === 1 ? incarnation : null };
    }
    const nextCursor = reader.text();
    const errorText = reader.text();
    const boostField = reader.text();
    const boostMember = reader.text();
    if ((!(presence & 2) && nextCursor !== "") || (!(presence & 16) && errorText !== "")
        || (!(presence & 32) && (boostField !== "" || boostMember !== "")))
        throw new ProtocolError("invalid Catalog search page tail");
    reader.finish();
    if (state === 0) {
        if (frame.subarray(9, 87).some(byte => byte !== 0) || entries.length || Object.keys(facets).length
            || Object.keys(facet_meta).length || text.length || facetConfigs.length || ranges.length || factors.length
            || checkpoint || nextCursor || errorText || boostField || boostMember)
            throw new ProtocolError("invalid disabled Catalog search page");
        return { state: "disabled" };
    }
    if ((presence & 64) ? factors.length !== 0 : relevance !== 0 || rankingClass !== 0 || rankingBoost !== 0)
        throw new ProtocolError("invalid Catalog search ranking");
    const ranking = presence & 64
        ? { mode: "weighted", relevance, class: rankingClass, boost: rankingBoost }
        : { mode: "ordered", factors };
    const fields = [
        ...facetConfigs.map(config => ({ name: config.name, type: "string", facet: true, operators: ["eq"], selector: { field: config.field, member: config.member } })),
        ...ranges.map(config => ({ name: config.name, type: "number", facet: false, operators: ["gt", "ge", "lt", "le"], selector: { field: config.field, member: config.member } })),
    ];
    return { state: state === 1 ? "building" : "ready", fields, entries,
        total: presence & 1 ? totalValue : null, facets, facet_meta,
        next_cursor: presence & 2 ? nextCursor : null,
        indexed_at_millis: presence & 4 ? indexedAt : null,
        checkpoint, indexed_records, processed_records,
        config: { exposure_approved: exposure === 1, text, facets: facetConfigs, ranges,
            max_facet_values, boost: presence & 32 ? { field: boostField, member: boostMember } : null,
            ranking, refresh_seconds },
        error: presence & 16 ? errorText : null, elapsed_ms };
}
//# sourceMappingURL=search.js.map