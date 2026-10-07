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
export interface QuoteSideCandleV2Value {
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly closingSize: number | null;
}
export declare class QuoteSideCandleV2 {
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly closingSize: number | null;
    constructor(value: QuoteSideCandleV2Value);
}
export interface BidAskCandleV2Value {
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteSideCandleV2 | null;
    readonly ask: QuoteSideCandleV2 | null;
    readonly quoteCount: bigint | null;
    readonly closingQuoteCondition: number | null;
}
export declare class BidAskCandleV2 {
    static readonly SCHEMA_ID = 41957;
    static readonly TEMPLATE_ID = 32795;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 97;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteSideCandleV2 | null;
    readonly ask: QuoteSideCandleV2 | null;
    readonly quoteCount: bigint | null;
    readonly closingQuoteCondition: number | null;
    constructor(value: BidAskCandleV2Value);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): BidAskCandleV2;
    static encodeBody(value: BidAskCandleV2Value): Uint8Array;
}
export type PublicExport = BidAskCandleV2;
export declare const PUBLIC_EXPORT_CODECS: Map<number, {
    readonly format: SbeFormat;
    decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): PublicExport;
}>;
//# sourceMappingURL=stream-3.d.ts.map