import { decodeFacets } from "./search.js";
import { KEYFIGURES_CONTRACTS } from "./generated/keyfigures.js";
import { ProtocolError } from "./protocol.js";
export { KEYFIGURES_CONTRACTS };
function object(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new ProtocolError("keyfigures object required");
    return value;
}
function uint64(value) {
    if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value))
        throw new ProtocolError("keyfigures uint64 string required");
    const result = BigInt(value);
    if (result > 0xffffffffffffffffn)
        throw new ProtocolError("keyfigures uint64 overflow");
    return result;
}
function count(value) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
        throw new ProtocolError("keyfigures unsigned integer required");
    return value;
}
function boolean(value) {
    if (typeof value !== "boolean")
        throw new ProtocolError("keyfigures boolean required");
    return value;
}
/** Validate the actual response against the generated universe projection before exposing its types. */
export function decodeKeyfigures(catalog, action, payload) {
    const value = object(payload), contract = KEYFIGURES_CONTRACTS[catalog];
    if (value.contract_fingerprint !== contract.fingerprint)
        throw new ProtocolError("keyfigures contract mismatch; regenerate SDK");
    if (value.clock !== "live" && value.clock !== "replay")
        throw new ProtocolError("invalid keyfigures clock");
    if (action === "schema") {
        const schema = object(value.contract), limits = object(value.limits), query = object(limits.query);
        if (schema.fingerprint !== contract.fingerprint || schema.catalog !== catalog)
            throw new ProtocolError("wrong keyfigures schema");
        if (!Array.isArray(value.fields) || value.fields.length !== contract.fields.length)
            throw new ProtocolError("runtime field capabilities required");
        const fields = value.fields.map(item => {
            const field = object(item);
            if (!contract.fields.some(f => f.name === field.name && f.type === field.type) || typeof field.facet !== "boolean" || !Array.isArray(field.operators) || field.operators.some(op => typeof op !== "string"))
                throw new ProtocolError("invalid runtime field capabilities");
            return field;
        });
        if (new Set(fields.map(field => field.name)).size !== contract.fields.length)
            throw new ProtocolError("duplicate runtime fields");
        if (!Array.isArray(limits.facets) || limits.facets.some(item => {
            const facet = object(item);
            return typeof facet.name !== "string" || !Array.isArray(facet.precedence) || facet.precedence.some(value => typeof value !== "string");
        }))
            throw new ProtocolError("invalid facet configuration");
        return { contract, fields, clock: value.clock, limits: { facets: limits.facets, maxFacetValues: count(limits.maxFacetValues), priceCutoffMs: count(limits.priceCutoffMs), maxRequestPriceCutoffMs: count(limits.maxRequestPriceCutoffMs), allowNoPriceCutoff: boolean(limits.allowNoPriceCutoff), query: { maxPage: count(query.maxPage), maxCandidates: count(query.maxCandidates), maxOffset: count(query.maxOffset) } } };
    }
    if (action === "instrument" && value.catalog !== catalog)
        throw new ProtocolError("wrong keyfigures catalog");
    if (!["elapsed", "trading-time", "last-completed-session"].includes(String(value.price_age_mode)))
        throw new ProtocolError("invalid keyfigures price age mode");
    const metadata = { catalog, epoch: uint64(value.epoch_id), clock: value.clock, price_cutoff_ms: count(value.price_cutoff_ms), price_age_mode: value.price_age_mode, contract_fingerprint: contract.fingerprint };
    const rows = action === "instrument" ? [value.result] : value.rows;
    if (!Array.isArray(rows))
        throw new ProtocolError("keyfigures rows required");
    const decoded = rows.map(item => {
        const row = object(item), fields = object(row.fields), blocks = object(row.blocks), observation = object(row.observation);
        for (const field of contract.fields) {
            const value = fields[field.name];
            if (value === null && field.nullable)
                continue;
            const expected = field.type === "integer" || field.type === "number" ? "number" : field.type;
            if (typeof value !== expected || (field.type === "number" && !Number.isFinite(value)) || (field.type === "integer" && !Number.isSafeInteger(value)))
                throw new ProtocolError(`invalid keyfigures field ${field.name}`);
        }
        for (const block of contract.blocks) {
            if (blocks[block.semantic] === null) {
                if (Object.values(block.projection).every(name => fields[name] !== null))
                    throw new ProtocolError("missing keyfigures block");
                continue;
            }
            const members = object(blocks[block.semantic]);
            for (const [member, field] of Object.entries(block.projection)) {
                const rawDescriptor = block.members[member], memberValue = members[member];
                if (!rawDescriptor)
                    throw new ProtocolError(`unknown universe block member ${block.semantic}.${member}`);
                const descriptor = object(rawDescriptor);
                const expected = descriptor.type === "integer" || descriptor.type === "number" ? "number" : descriptor.type;
                if (memberValue === null || typeof memberValue !== expected
                    || (descriptor.type === "number" && !Number.isFinite(memberValue))
                    || (descriptor.type === "integer" && !Number.isSafeInteger(memberValue))
                    || memberValue !== fields[field])
                    throw new ProtocolError(`invalid universe block ${block.semantic}.${member}`);
            }
        }
        const requirements = object(observation.requirements);
        if (!Array.isArray(requirements.clauses) || !requirements.clauses.length)
            throw new ProtocolError("keyfigures license requirements missing");
        for (const clause of requirements.clauses) {
            if (clause === "Public")
                continue;
            const alternatives = object(clause).AnyOf;
            if (!Array.isArray(alternatives) || !alternatives.length || alternatives.some(value => {
                const license = object(value);
                return typeof license.namespace !== "string" || !license.namespace || typeof license.license !== "string" || !license.license;
            }))
                throw new ProtocolError("invalid keyfigures license clause");
        }
        const sources = observation.source == null ? [] : [observation.source];
        if (!Array.isArray(observation.dependencies))
            throw new ProtocolError("invalid keyfigures dependency provenance");
        sources.push(...observation.dependencies);
        for (const item of sources) {
            const source = object(item);
            if (["input", "catalog", "key"].some(name => typeof source[name] !== "string" || !source[name]) || !["RT", "DL", "EOD"].includes(String(source.quality)) || !["live", "replay"].includes(String(source.clock)) || !["elapsed", "trading-time", "last-completed-session"].includes(String(source.price_age_mode)) || !Number.isSafeInteger(source.cutoff_us) || !Number.isSafeInteger(source.price_cutoff_ms) || !Number.isSafeInteger(source.quote_event_us) || !Number.isSafeInteger(source.message_id) || !Array.isArray(source.fallback) || source.fallback.some(value => {
                const rejection = object(value);
                return typeof rejection.input !== "string" || typeof rejection.reason !== "string";
            }))
                throw new ProtocolError("invalid keyfigures price provenance");
        }
        if (observation.reason !== null && typeof observation.reason !== "string")
            throw new ProtocolError("invalid keyfigures availability");
        return { fields, blocks, observation: { source: observation.source ?? null, dependencies: observation.dependencies, event_us: observation.event_us === null ? null : uint64(observation.event_us), message_id: observation.message_id === null ? null : uint64(observation.message_id), reason: observation.reason, requirements } };
    });
    if (action === "instrument")
        return { ...metadata, result: decoded[0] };
    if ((value.next_cursor !== null && typeof value.next_cursor !== "string") || value.facet_basis !== "snapshot_exact" || value.ordering !== "snapshot_windows_live_reranked_best_effort")
        throw new ProtocolError("invalid keyfigures search metadata");
    return { ...metadata, ...decodeFacets(value), next_cursor: value.next_cursor, facet_basis: value.facet_basis, ordering: value.ordering,
        snapshot_cutoff_us: value.snapshot_cutoff_us === null ? null : count(value.snapshot_cutoff_us), live_cutoff_us: value.live_cutoff_us === null ? null : count(value.live_cutoff_us), rows: decoded, snapshot_matches: count(value.snapshot_matches), candidates: count(value.candidates), candidate_budget_exhausted: boolean(value.candidate_budget_exhausted), underfilled: boolean(value.underfilled) };
}
//# sourceMappingURL=keyfigures.js.map