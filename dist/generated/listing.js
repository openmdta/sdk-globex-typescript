export function decodeListingEvent(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let offset = 0;
    const take = (length) => {
        if (!Number.isSafeInteger(length) || length < 0 || offset + length > bytes.byteLength)
            throw new Error("truncated listing event");
        const part = bytes.subarray(offset, offset + length);
        offset += length;
        return part;
    };
    const uint16 = () => {
        if (offset + 2 > bytes.byteLength)
            throw new Error("truncated listing event");
        const value = view.getUint16(offset, true);
        offset += 2;
        return value;
    };
    const uint32 = () => {
        if (offset + 4 > bytes.byteLength)
            throw new Error("truncated listing event");
        const value = view.getUint32(offset, true);
        offset += 4;
        return value;
    };
    const uint64 = () => {
        if (offset + 8 > bytes.byteLength)
            throw new Error("truncated listing event");
        const value = view.getBigUint64(offset, true);
        offset += 8;
        return value;
    };
    const data = () => take(uint32());
    const text = () => decoder.decode(data());
    const group = (blockLength, limit) => {
        const encodedLength = uint16(), count = uint32();
        if (encodedLength !== blockLength || count > limit)
            throw new Error("invalid listing group header");
        return count;
    };
    if (bytes.byteLength < 2)
        throw new Error("truncated listing event");
    const snapshot = bytes[0], connected = bytes[1];
    if (snapshot > 1 || connected > 1)
        throw new Error("invalid listing event flags");
    offset = 2;
    const sourceBlocks = [];
    for (let i = group(2, 64); i > 0; i--)
        sourceBlocks.push(uint16());
    if (!sourceBlocks.length)
        throw new Error("empty listing source blocks");
    const blocks = [];
    for (let i = group(19, 64); i > 0; i--) {
        const id = uint16(), messageId = uint64(), eventUs = uint64();
        const clear = take(1)[0];
        if (clear > 1)
            throw new Error("invalid listing clear flag");
        const clauses = [];
        for (let j = group(2, 4096); j > 0; j--) {
            const index = uint16(), namespace = text(), license = text();
            if (index > clauses.length)
                throw new Error("listing license clauses are not contiguous");
            if (!namespace && !license) {
                if (index !== clauses.length)
                    throw new Error("invalid public listing clause");
                clauses.push("Public");
            }
            else {
                if (!namespace || !license)
                    throw new Error("invalid qualified listing license");
                if (index === clauses.length)
                    clauses.push({ AnyOf: [] });
                const clause = clauses[index];
                if (clause === undefined || clause === "Public")
                    throw new Error("invalid listing license clause");
                clause.AnyOf.push({ namespace, license });
            }
        }
        if (!clauses.length)
            throw new Error("empty listing license requirements");
        const payload = data();
        if (clear && payload.byteLength)
            throw new Error("clear listing block has a payload");
        blocks.push({ id, messageId, eventUs, clear: clear === 1, requirements: { clauses }, payload });
    }
    const dataset = text(), quality = text(), key = text(), incarnation = text();
    let aggregationQuality;
    if (offset < bytes.byteLength) {
        const payload = data();
        if (payload.byteLength !== 13 || payload[4] > 1)
            throw new Error("invalid aggregation quality");
        const qualityView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
        aggregationQuality = { tradingDay: qualityView.getUint32(0, true), partial: payload[4] === 1, lastAppliedId: qualityView.getBigUint64(5, true) };
    }
    if (offset !== bytes.byteLength || !dataset || !key || key.length > 1024 || !["RT", "DL", "EOD"].includes(quality))
        throw new Error("invalid listing event source");
    return { source: { dataset, quality: quality, key, blocks: sourceBlocks }, incarnation, snapshot: snapshot === 1, connected: connected === 1, blocks, ...(aggregationQuality === undefined ? {} : { aggregationQuality }) };
}
//# sourceMappingURL=listing.js.map