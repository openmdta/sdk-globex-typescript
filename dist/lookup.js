import { ProtocolError } from "./protocol.js";
import { WireReader } from "./wire-reader.js";
function requirements(reader) {
    const clauses = [];
    const count = reader.group(0);
    for (let i = 0; i < count; i++) {
        const ids = [];
        const length = reader.group(2);
        for (let j = 0; j < length; j++)
            ids.push(reader.u16());
        if (ids.length === 0)
            throw new ProtocolError("empty Catalog license clause");
        clauses.push(ids);
    }
    return clauses;
}
function lifecycle(frame, origins) {
    const reader = new WireReader(frame);
    if (reader.u16() !== 44 || reader.u16() !== 8 || reader.u16() !== 14 || reader.u16() !== 4)
        throw new ProtocolError("unsupported Catalog lifecycle format");
    const listingCode = reader.u8();
    const activityCode = reader.u8();
    const visibleCode = reader.u8();
    const presence = reader.u8();
    if (listingCode > 1 || visibleCode > 1 || presence & ~3 || (listingCode === 0 ? activityCode !== 0 : activityCode < 1 || activityCode > 3))
        throw new ProtocolError("invalid Catalog lifecycle fields");
    const effective_time_micros = reader.u64();
    const hideAt = reader.u64();
    const hiddenAt = reader.u64();
    const incarnation = reader.u64();
    const message_id = reader.u64();
    const clauses = requirements(reader);
    const origin_ids = [];
    const count = reader.group(4);
    for (let i = 0; i < count; i++)
        origin_ids.push(reader.u32());
    reader.finish();
    return {
        listing: listingCode === 1 ? "Listed" : "NotListed",
        activity: activityCode === 0 ? null : ["Active", "Inactive", "Unknown"][activityCode - 1],
        visible: visibleCode === 1,
        effective_time_micros,
        hide_at_micros: presence & 1 ? hideAt : null,
        hidden_at_unix_seconds: presence & 2 ? hiddenAt : null,
        source_position: { incarnation, message_id },
        requirements: clauses,
        origin_ids,
        origins,
    };
}
export function decodeCatalogLookup(frame) {
    if (frame.byteLength > 8 * 1024 * 1024 + 8)
        throw new ProtocolError("Catalog lookup page exceeds 8 MiB");
    const reader = new WireReader(frame);
    if (reader.u16() !== 13 || reader.u16() !== 4 || reader.u16() !== 7 || reader.u16() !== 6)
        throw new ProtocolError("unsupported Catalog browse page format");
    const generation = reader.u64();
    const scanned = reader.u32();
    const presence = reader.u8();
    if (presence & ~7)
        throw new ProtocolError("invalid Catalog browse page presence");
    const dimensions = [];
    const dimensionCount = reader.group(0);
    for (let i = 0; i < dimensionCount; i++)
        dimensions.push(reader.text());
    const entries = [];
    const entryCount = reader.group(1);
    for (let i = 0; i < entryCount; i++) {
        const lifecyclePresent = reader.u8();
        if (lifecyclePresent > 1)
            throw new ProtocolError("invalid Catalog lifecycle presence");
        const values = Object.create(null);
        const valueCount = reader.group(0);
        for (let j = 0; j < valueCount; j++) {
            const name = reader.text();
            const value = reader.text();
            (values[name] ??= []).push(value);
        }
        const entryRequirements = requirements(reader);
        const origins = [];
        const originCount = reader.group(17);
        for (let j = 0; j < originCount; j++) {
            const kind = reader.u8();
            const originGeneration = reader.u64();
            const revision = reader.u64();
            const dataset = reader.text();
            const incarnation = reader.text();
            const reference = reader.text();
            if (kind === 0 && revision === 0n)
                origins.push({ kind: "import", dataset, generation: originGeneration, incarnation, run_id: reference });
            else if (kind === 1 && incarnation === "")
                origins.push({ kind: "manual", dataset, generation: originGeneration, record_id: reference, revision });
            else if (kind === 2 && incarnation === "")
                origins.push({ kind: "correction", dataset, generation: originGeneration, correction_id: reference, revision });
            else
                throw new ProtocolError("invalid Catalog value origin");
        }
        const key = reader.text();
        const lifecycleFrame = reader.data();
        if (lifecyclePresent === 0 && (lifecycleFrame.length !== 0 || origins.length !== 0))
            throw new ProtocolError("unexpected Catalog lifecycle data");
        entries.push({ key, dimensions: values, requirements: entryRequirements,
            lifecycle: lifecyclePresent === 1 ? lifecycle(lifecycleFrame, origins) : null });
    }
    const fields = [];
    const fieldCount = reader.group(7);
    for (let i = 0; i < fieldCount; i++) {
        const flags = reader.u8();
        const wire_id = reader.u16();
        const length = reader.u32();
        const entityType = reader.text();
        const label = reader.text();
        const semanticText = reader.text();
        if (flags & ~15 || (!(flags & 1) && entityType !== "") || (!(flags & 2) && semanticText !== "") || (!(flags & 4) && length !== 0))
            throw new ProtocolError("invalid Catalog field presence");
        fields.push({ entity_type: flags & 1 ? entityType : null, multiple: Boolean(flags & 8), label,
            semantic: flags & 2 ? semanticText : null, wire_id, fixed_length: flags & 4 ? length : null });
    }
    const stream_fields = [];
    const streamFieldCount = reader.group(7);
    for (let i = 0; i < streamFieldCount; i++) {
        const id = reader.u16();
        const growth = reader.u8();
        const length = reader.u32();
        const semantic = reader.text();
        if (growth > 1)
            throw new ProtocolError("invalid Catalog stream field");
        stream_fields.push({ semantic, id, compatible_growth: growth === 1, fixed_length: length === 0xffffffff ? null : length });
    }
    const catalog = reader.text();
    const incarnation = reader.text();
    const datasetRecordType = reader.text();
    const streamFieldsError = reader.text();
    const nextCursor = reader.text();
    if ((!(presence & 1) && datasetRecordType !== "") || (!(presence & 2) && streamFieldsError !== "") || (!(presence & 4) && nextCursor !== ""))
        throw new ProtocolError("invalid Catalog page presence");
    reader.finish();
    return { catalog, incarnation, generation, scanned, dimensions, entries, fields, stream_fields,
        dataset_record_type: presence & 1 ? datasetRecordType : null,
        stream_fields_error: presence & 2 ? streamFieldsError : null,
        next_cursor: presence & 4 ? nextCursor : null };
}
//# sourceMappingURL=lookup.js.map