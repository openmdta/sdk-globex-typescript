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
export interface QuoteSideCandleValue {
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly closingSize: number;
}
export declare class QuoteSideCandle {
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly closingSize: number;
    constructor(value: QuoteSideCandleValue);
}
export interface BidAskCandleValue {
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteSideCandle | null;
    readonly ask: QuoteSideCandle | null;
    readonly quoteCount: bigint;
    readonly closingQuoteCondition: number | null;
}
export declare class BidAskCandle {
    static readonly SCHEMA_ID = 100;
    static readonly TEMPLATE_ID = 12;
    static readonly VERSION = 3;
    static readonly BLOCK_LENGTH = 97;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteSideCandle | null;
    readonly ask: QuoteSideCandle | null;
    readonly quoteCount: bigint;
    readonly closingQuoteCondition: number | null;
    constructor(value: BidAskCandleValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): BidAskCandle;
    static encodeBody(value: BidAskCandleValue): Uint8Array;
}
export type PublicExport = BidAskCandle;
export declare const PUBLIC_EXPORT_CODECS: Map<number, {
    readonly format: SbeFormat;
    decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): PublicExport;
}>;
//# sourceMappingURL=stream-1.d.ts.map