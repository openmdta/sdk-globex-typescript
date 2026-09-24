export function decodeListingEvent(bytes) {
    const event = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const u64 = (value) => {
        if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value))
            throw new Error("invalid listing timestamp or fence");
        const result = BigInt(value);
        if (result > 18446744073709551615n)
            throw new Error("listing timestamp or fence exceeds u64");
        return result;
    };
    if (!event || typeof event.incarnation !== "string" || typeof event.snapshot !== "boolean" || typeof event.connected !== "boolean" || typeof event.gapped !== "boolean" || !Array.isArray(event.blocks))
        throw new Error("invalid listing event");
    const source = event.source;
    if (!source || (source.progressOnly !== undefined && typeof source.progressOnly !== "boolean") || typeof source.dataset !== "string" || typeof source.key !== "string" || !["RT", "DL", "EOD"].includes(source.quality) || !Array.isArray(source.blocks) || !source.blocks.every((id) => Number.isInteger(id) && Number(id) >= 0 && Number(id) <= 65535))
        throw new Error("invalid listing source");
    return { ...event, gapThroughId: u64(event.gapThroughId === undefined ? "0" : event.gapThroughId), coverageFence: u64(event.coverageFence), progressUs: event.progressUs === null ? null : u64(event.progressUs), blocks: event.blocks.map((block) => {
            if (!Number.isInteger(block.id) || block.id < 0 || block.id > 65535 || typeof block.clear !== "boolean" || !Array.isArray(block.payload) || !block.payload.every(value => Number.isInteger(value) && value >= 0 && value <= 255) || (block.clear && block.payload.length))
                throw new Error("invalid listing block");
            if (!block.requirements || !Array.isArray(block.requirements.clauses) || !block.requirements.clauses.every(clause => clause === "Public" || (clause && Array.isArray(clause.AnyOf) && clause.AnyOf.every((license) => typeof license.namespace === "string" && typeof license.license === "string"))))
                throw new Error("invalid listing license requirement");
            return { ...block, messageId: u64(block.messageId), eventUs: u64(block.eventUs), payload: Uint8Array.from(block.payload) };
        }) };
}
//# sourceMappingURL=listing.js.map