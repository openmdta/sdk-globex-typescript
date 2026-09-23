const marketSelector = Symbol("MarketSelector");

export interface MarketSelector {
  readonly [marketSelector]: true;
  readonly expression: string;
  readonly subject: "entity" | "list" | "record";
  /** Strings select a union; an array selects the first available MIC per member. */
  venue(...preferences: readonly (string | readonly string[])[]): MarketSelector;
}

export const selectorExpression = (value: MarketSelector): string => {
  if (!value || value[marketSelector] !== true) throw new TypeError("market data requires a selector created by selector.*");
  return value.expression;
};

class Selector implements MarketSelector {
  readonly [marketSelector] = true;
  readonly subject: "entity" | "list" | "record";

  constructor(
    readonly expression: string,
    private readonly identifier = expression,
  ) {
    this.subject = identifier.startsWith("LIST(") ? "list" : identifier.startsWith("RAW(") ? "record" : "entity";
  }

  venue(...preferences: readonly (string | readonly string[])[]): MarketSelector {
    if (this.subject === "record") throw new TypeError("an exact DatasetRecord cannot have venue preferences");
    const groups = preferences.map(group => typeof group === "string" ? [group] : group);
    if (!groups.length || groups.some(group => !group.length)) {
      throw new TypeError("venue preferences must contain at least one non-empty fallback group");
    }
    const normalized = groups.map(group => group.map(venue => {
      const value = venue.trim().toUpperCase();
      if (!/^(?:\*|[A-Z0-9]{4})$/.test(value)) throw new TypeError(`invalid MIC ${venue}`);
      return value;
    }));
    return new Selector(`${this.identifier}@${normalized.map(group => group.join(">")).join(",")}`, this.identifier);
  }
}

const typed = (type: string, value: string): MarketSelector => {
  const normalizedType = type.trim().toUpperCase();
  const normalizedValue = value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(normalizedType) || !normalizedValue || /[()]/.test(normalizedValue)) {
    throw new TypeError("selector type and value must form a non-empty scalar identifier");
  }
  return new Selector(`${normalizedType}(${normalizedValue})`);
};

export const selector = Object.freeze({
  list: (value: string): MarketSelector => {
    const code = value.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(code)) throw new TypeError("invalid list code");
    return typed("LIST", code);
  },
  us: (value: string) => typed("US", value),
  isin: (value: string) => typed("ISIN", value),
  cusip: (value: string) => typed("CUSIP", value),
  sedol: (value: string) => typed("SEDOL", value),
  wkn: (value: string) => typed("WKN", value),
  figi: (value: string) => typed("FIGI", value),
  custom: typed,
  raw: (dataset: string, datasetRecordKey: string): MarketSelector => {
    const normalizedDataset = dataset.trim();
    const normalizedKey = datasetRecordKey.trim();
    if (!normalizedDataset || !normalizedKey || /[(),]/.test(normalizedDataset)) {
      throw new TypeError("raw selector requires a Dataset and DatasetRecord key");
    }
    return new Selector(`RAW(${normalizedDataset},${normalizedKey})`);
  },
});
