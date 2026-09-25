export interface SbeFormat {
    readonly schemaId: number;
    readonly templateId: number;
    readonly version: number;
    readonly blockLength: number;
}
export interface DecimalConstructor<T> {
    new (value: string): T;
}
export interface DecimalValue {
    readonly mantissa: bigint;
    readonly exponent: number;
}
export declare class Decimal {
    readonly mantissa: bigint;
    readonly exponent: number;
    constructor(value: DecimalValue);
    isNegative(): boolean;
    compareTo(other: DecimalValue): -1 | 0 | 1;
    equals(other: DecimalValue): boolean;
    toParts(): DecimalValue;
    to<T>(Target: DecimalConstructor<T>): T;
    toNumber(): number;
    toString(): string;
    toLocaleString(locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions): string;
}
export interface QuoteLevelValue {
    readonly price: Decimal;
    readonly size: number;
}
export declare class QuoteLevel {
    readonly price: Decimal;
    readonly size: number;
    constructor(value: QuoteLevelValue);
}
export interface BidAskValue {
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteLevel | null;
    readonly ask: QuoteLevel | null;
    readonly quoteCondition: number | null;
}
export declare class BidAsk {
    static readonly SCHEMA_ID = 100;
    static readonly TEMPLATE_ID = 10;
    static readonly VERSION = 3;
    static readonly BLOCK_LENGTH = 35;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteLevel | null;
    readonly ask: QuoteLevel | null;
    readonly quoteCondition: number | null;
    constructor(value: BidAskValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): BidAsk;
    static encodeBody(value: BidAskValue): Uint8Array;
}
export type PublicExport = BidAsk;
export declare const PUBLIC_EXPORT_CODECS: Map<number, {
    readonly format: SbeFormat;
    decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): PublicExport;
}>;
//# sourceMappingURL=stream-0.d.ts.map