declare const marketSelector: unique symbol;
export interface MarketSelector {
    readonly [marketSelector]: true;
    readonly expression: string;
    readonly subject: "entity" | "list" | "record";
    /** Strings select a union; an array selects the first available MIC per member. */
    venue(...preferences: readonly (string | readonly string[])[]): MarketSelector;
}
export declare const selectorExpression: (value: MarketSelector) => string;
declare const typed: (type: string, value: string) => MarketSelector;
export declare const selector: Readonly<{
    list: (value: string) => MarketSelector;
    us: (value: string) => MarketSelector;
    isin: (value: string) => MarketSelector;
    cusip: (value: string) => MarketSelector;
    sedol: (value: string) => MarketSelector;
    wkn: (value: string) => MarketSelector;
    figi: (value: string) => MarketSelector;
    custom: typeof typed;
    raw: (dataset: string, datasetRecordKey: string) => MarketSelector;
}>;
export {};
//# sourceMappingURL=selector.d.ts.map