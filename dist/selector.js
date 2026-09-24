const marketSelector = Symbol("MarketSelector");
export const selectorExpression = (value) => {
    if (!value || value[marketSelector] !== true)
        throw new TypeError("market data requires a selector created by selector.*");
    return value.expression;
};
class Selector {
    expression;
    identifier;
    [marketSelector] = true;
    subject;
    constructor(expression, identifier = expression) {
        this.expression = expression;
        this.identifier = identifier;
        this.subject = identifier.startsWith("LIST(") ? "list" : identifier.startsWith("RAW(") ? "record" : "entity";
    }
    venue(...preferences) {
        if (this.subject === "record")
            throw new TypeError("an exact DatasetRecord cannot have venue preferences");
        const groups = preferences.map(group => typeof group === "string" ? [group] : group);
        if (!groups.length || groups.some(group => !group.length)) {
            throw new TypeError("venue preferences must contain at least one non-empty fallback group");
        }
        const normalized = groups.map(group => group.map(venue => {
            const value = venue.trim().toUpperCase();
            if (!/^(?:\*|[A-Z0-9]{4})$/.test(value))
                throw new TypeError(`invalid MIC ${venue}`);
            return value;
        }));
        return new Selector(`${this.identifier}@${normalized.map(group => group.join(">")).join(",")}`, this.identifier);
    }
}
const typed = (type, value) => {
    const normalizedType = type.trim().toUpperCase();
    const normalizedValue = value.trim().toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(normalizedType) || !normalizedValue || /[()]/.test(normalizedValue)) {
        throw new TypeError("selector type and value must form a non-empty scalar identifier");
    }
    return new Selector(`${normalizedType}(${normalizedValue})`);
};
export const selector = Object.freeze({
    list: (value) => {
        const code = value.trim().toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(code))
            throw new TypeError("invalid list code");
        return typed("LIST", code);
    },
    us: (value) => typed("US", value),
    isin: (value) => typed("ISIN", value),
    cusip: (value) => typed("CUSIP", value),
    sedol: (value) => typed("SEDOL", value),
    wkn: (value) => typed("WKN", value),
    figi: (value) => typed("FIGI", value),
    custom: typed,
    raw: (dataset, datasetRecordKey) => {
        const normalizedDataset = dataset.trim();
        const normalizedKey = datasetRecordKey.trim();
        if (!normalizedDataset || !normalizedKey || /[(),]/.test(normalizedDataset)) {
            throw new TypeError("raw selector requires a Dataset and DatasetRecord key");
        }
        return new Selector(`RAW(${normalizedDataset},${normalizedKey})`);
    },
});
//# sourceMappingURL=selector.js.map