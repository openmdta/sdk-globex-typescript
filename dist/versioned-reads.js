export function versionRequests(contracts, families, allowLossy = false) {
    const selected = families ?? [...new Set(contracts.map(contract => contract.id.family))];
    if (!selected.length || selected.length > 64 || new Set(selected).size !== selected.length)
        throw new Error("select 1–64 distinct field families");
    return selected.map(family => {
        const known = contracts.filter(contract => contract.id.family === family);
        if (!known.length)
            throw new Error(`SDK does not know field family ${family}`);
        return { supported: known.map(contract => contract.id), delivery: { kind: "get" }, allowLossy, pins: Object.fromEntries(known.map(contract => [String(contract.id.version), contract.sha256])) };
    });
}
export function validateVersionedRecords(value, contracts, requests) {
    if (!Array.isArray(value))
        throw new Error("invalid versioned record response");
    for (const record of value) {
        if (!record || typeof record.exists !== "boolean" || !Array.isArray(record.versionedFields))
            throw new Error("missing version negotiation result");
        const identities = new Set();
        for (const field of record.versionedFields) {
            const known = contracts.find(contract => contract.id.family === field?.contract?.family && contract.id.version === field?.contract?.version);
            const request = requests.find(request => request.supported.some(id => id.family === field?.contract?.family && id.version === field?.contract?.version));
            if (!known || !request || known.field !== field.field || known.sha256 !== field.conversion?.targetSha256 || typeof field.payloadBase64 !== "string" || typeof field.conversion?.lossy !== "boolean" || (field.conversion.lossy && !request.allowLossy))
                throw new Error("unrecognized or incompatible negotiated contract");
            const identity = JSON.stringify([field.contract.family, field.subfield ?? null]);
            if (identities.has(identity))
                throw new Error("duplicate versioned family/subfield");
            identities.add(identity);
        }
    }
    return value;
}
//# sourceMappingURL=versioned-reads.js.map