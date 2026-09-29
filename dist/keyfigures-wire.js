import { ProtocolError } from "./protocol.js";
import { WireReader } from "./wire-reader.js";
function owner(bytes, template, fixed) {
    if (bytes.byteLength < 8 + fixed || bytes.byteLength > 16 * 1024 * 1024)
        throw new ProtocolError("invalid Keyfigures owner length");
    const reader = new WireReader(bytes);
    if (reader.u16() !== fixed || reader.u16() !== template || reader.u16() !== 10 || reader.u16() !== 2)
        throw new ProtocolError("unexpected Keyfigures owner format");
    return reader;
}
function safe(value) {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER))
        throw new ProtocolError("Keyfigures value exceeds exact JavaScript number range");
    return Number(value);
}
function clock(value) {
    if (value === 1)
        return "live";
    if (value === 2)
        return "replay";
    throw new ProtocolError("invalid Keyfigures clock");
}
function age(value) {
    if (value === 1)
        return "elapsed";
    if (value === 2)
        return "trading-time";
    if (value === 3)
        return "last-completed-session";
    throw new ProtocolError("invalid Keyfigures age mode");
}
function requirements(bytes) {
    const reader = owner(bytes, 8, 0), clauses = [];
    const count = reader.group(1);
    for (let index = 0; index < count; index++) {
        const kind = reader.u8(), alternatives = [];
        const length = reader.group(0);
        for (let member = 0; member < length; member++)
            alternatives.push({ namespace: reader.text(), license: reader.text() });
        if (kind === 0 && alternatives.length === 0)
            clauses.push("Public");
        else if (kind === 1 && alternatives.length > 0)
            clauses.push({ AnyOf: alternatives });
        else
            throw new ProtocolError("invalid Keyfigures license clause");
    }
    reader.finish();
    return { clauses };
}
function provenance(bytes) {
    const reader = owner(bytes, 7, 35);
    const cutoff_us = safe(reader.u64()), price_cutoff_ms = safe(reader.u64());
    const quote_event_us = safe(reader.u64()), message_id = safe(reader.u64());
    const qualityCode = reader.u8(), quality = ["", "RT", "DL", "EOD"][qualityCode];
    const sourceClock = clock(reader.u8()), price_age_mode = age(reader.u8());
    if (!quality)
        throw new ProtocolError("invalid Keyfigures quality");
    const fallback = [], count = reader.group(0);
    for (let index = 0; index < count; index++)
        fallback.push({ input: reader.text(), reason: reader.text() });
    const input = reader.text(), catalog = reader.text(), key = reader.text();
    reader.finish();
    return { cutoff_us, price_cutoff_ms, quote_event_us, message_id, quality, clock: sourceClock,
        price_age_mode, fallback, input, catalog, key };
}
function row(bytes, contract) {
    const reader = owner(bytes, 6, 17);
    const event = reader.u64(), message = reader.u64(), presence = reader.u8();
    if (presence & ~7 || (!(presence & 1) && event !== 0n) || (!(presence & 2) && message !== 0n))
        throw new ProtocolError("invalid Keyfigures observation presence");
    const fields = {};
    const declared = [...contract.fields].sort((a, b) => a.columnId - b.columnId);
    if (reader.group(21) !== declared.length)
        throw new ProtocolError("Keyfigures field count changed");
    for (let index = 0; index < declared.length; index++) {
        const field = declared[index];
        const id = reader.u16(), kind = reader.u8(), present = reader.u8();
        const number = reader.f64(), integer = BigInt.asIntN(64, reader.u64()), boolean = reader.u8();
        const text = reader.text();
        const expected = { string: 1, integer: 2, number: 3, boolean: 4 }[field.type];
        if (id !== index || kind !== expected || present > 1 || boolean > 1 || (!present && !field.nullable)
            || (kind !== 1 && text !== ""))
            throw new ProtocolError("Keyfigures field contract mismatch");
        fields[field.name] = !present ? null : kind === 1 ? text : kind === 2 ? safe(integer)
            : kind === 3 ? Number.isFinite(number) ? number : (() => { throw new ProtocolError("nonfinite Keyfigures number"); })()
                : boolean === 1;
    }
    const sources = reader.group(1), dependencies = [];
    let source = null;
    for (let index = 0; index < sources; index++) {
        const role = reader.u8(), value = provenance(reader.data());
        if (role === 1 && source === null && dependencies.length === 0)
            source = value;
        else if (role === 2)
            dependencies.push(value);
        else
            throw new ProtocolError("invalid Keyfigures provenance role");
    }
    const licenses = requirements(reader.data()), reasonText = reader.text();
    if (reader.text() !== contract.fingerprint || (!(presence & 4) && reasonText !== ""))
        throw new ProtocolError("Keyfigures row fingerprint mismatch");
    reader.finish();
    const blocks = {};
    for (const block of contract.blocks) {
        const members = {};
        for (const [member, field] of Object.entries(block.projection)) {
            if (!Object.hasOwn(fields, field))
                throw new ProtocolError("unknown Keyfigures block field");
            members[member] = fields[field];
        }
        blocks[block.semantic] = Object.values(members).some(value => value === null) ? null : members;
    }
    const observation = { event_us: presence & 1 ? event.toString() : null,
        message_id: presence & 2 ? message.toString() : null, source, dependencies,
        reason: presence & 4 ? reasonText : null, requirements: licenses };
    return { fields, blocks, observation,
        instrument: { id: fields.id, name: fields.name, symbol: fields.symbol, asset_class: fields.asset_class },
        quote: { event_us: event.toString(), message_id: message.toString(), source,
            reason: observation.reason, requirements: licenses } };
}
export function decodeKeyfiguresWire(action, bytes, contract) {
    const template = action === "schema" ? 2 : action === "instrument" ? 4 : 5;
    const fixed = action === "schema" ? 36 : action === "instrument" ? 18 : 53;
    const reader = owner(bytes, template, fixed);
    if (action === "schema") {
        const valueClock = clock(reader.u8()), allowNoPriceCutoff = reader.u8();
        const maxFacetValues = reader.u16(), priceCutoffMs = safe(reader.u64());
        const maxRequestPriceCutoffMs = safe(reader.u64());
        const maxPage = reader.u32(), maxCandidates = reader.u32(), maxOffset = reader.u32(), reserved = reader.u32();
        if (allowNoPriceCutoff > 1 || reserved !== 0)
            throw new ProtocolError("invalid Keyfigures schema flags");
        const declared = [...contract.fields].sort((a, b) => a.columnId - b.columnId);
        if (reader.group(3) !== declared.length)
            throw new ProtocolError("Keyfigures schema field count changed");
        const fields = declared.map((field, index) => {
            const id = reader.u16(), facet = reader.u8();
            if (id !== index || facet > 1)
                throw new ProtocolError("invalid Keyfigures schema field");
            const operators = [], count = reader.group(0);
            for (let item = 0; item < count; item++)
                operators.push(reader.text());
            return { ...field, facet: facet === 1, operators };
        });
        const facets = [], count = reader.group(0);
        for (let index = 0; index < count; index++) {
            const precedence = [], length = reader.group(0);
            for (let item = 0; item < length; item++)
                precedence.push(reader.text());
            facets.push({ name: reader.text(), precedence });
        }
        if (reader.text() !== contract.catalog || reader.text() !== contract.fingerprint)
            throw new ProtocolError("Keyfigures schema contract mismatch");
        reader.finish();
        return { contract, contract_fingerprint: contract.fingerprint, clock: valueClock, fields,
            limits: { facets, maxFacetValues, priceCutoffMs, maxRequestPriceCutoffMs,
                allowNoPriceCutoff: allowNoPriceCutoff === 1, query: { maxPage, maxCandidates, maxOffset } } };
    }
    const valueClock = clock(reader.u8()), price_age_mode = age(reader.u8());
    if (action === "instrument") {
        const epoch = reader.u64(), price_cutoff_ms = safe(reader.u64());
        if (reader.text() !== contract.catalog || reader.text() !== contract.fingerprint)
            throw new ProtocolError("Keyfigures instrument contract mismatch");
        const result = row(reader.data(), contract);
        reader.finish();
        return { catalog: contract.catalog, contract_fingerprint: contract.fingerprint,
            epoch_id: epoch.toString(), clock: valueClock, price_age_mode, price_cutoff_ms, result };
    }
    const presence = reader.u8(), flags = reader.u8();
    if (presence & ~7 || flags & ~3)
        throw new ProtocolError("invalid Keyfigures search flags");
    const epoch = reader.u64(), price_cutoff_ms = safe(reader.u64());
    const snapshot = reader.u64(), live = reader.u64();
    const snapshot_matches = safe(reader.u64()), candidates = safe(reader.u64());
    if (reader.u8() !== 0 || (!(presence & 1) && snapshot !== 0n) || (!(presence & 2) && live !== 0n))
        throw new ProtocolError("invalid Keyfigures search presence");
    const rows = [], rowCount = reader.group(0);
    for (let index = 0; index < rowCount; index++)
        rows.push(row(reader.data(), contract));
    const facets = {}, facetCount = reader.group(0);
    for (let index = 0; index < facetCount; index++) {
        const values = {}, count = reader.group(8);
        for (let item = 0; item < count; item++) {
            const total = safe(reader.u64()), name = reader.text();
            if (Object.hasOwn(values, name))
                throw new ProtocolError("duplicate Keyfigures facet value");
            values[name] = total;
        }
        const name = reader.text();
        if (Object.hasOwn(facets, name))
            throw new ProtocolError("duplicate Keyfigures facet");
        facets[name] = values;
    }
    const facet_meta = {}, metaCount = reader.group(1);
    for (let index = 0; index < metaCount; index++) {
        const exhaustive = reader.u8(), name = reader.text();
        if (exhaustive > 1 || Object.hasOwn(facet_meta, name))
            throw new ProtocolError("invalid Keyfigures facet metadata");
        facet_meta[name] = { exhaustive: exhaustive === 1 };
    }
    if (reader.text() !== contract.catalog || reader.text() !== contract.fingerprint)
        throw new ProtocolError("Keyfigures search contract mismatch");
    const cursor = reader.text();
    if (!(presence & 4) && cursor !== "")
        throw new ProtocolError("invalid Keyfigures cursor presence");
    reader.finish();
    return { catalog: contract.catalog, contract_fingerprint: contract.fingerprint,
        epoch_id: epoch.toString(), clock: valueClock, price_age_mode, price_cutoff_ms,
        snapshot_cutoff_us: presence & 1 ? safe(snapshot) : null, live_cutoff_us: presence & 2 ? safe(live) : null,
        snapshot_matches, candidates, candidate_budget_exhausted: Boolean(flags & 1), underfilled: Boolean(flags & 2),
        next_cursor: presence & 4 ? cursor : null, facet_basis: "snapshot_exact",
        ordering: "snapshot_windows_live_reranked_best_effort", facets, facet_meta, rows };
}
//# sourceMappingURL=keyfigures-wire.js.map