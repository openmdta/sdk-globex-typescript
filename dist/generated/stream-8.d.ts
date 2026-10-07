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
export interface TradeOhlcvvCandleV2Value {
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly totalVolume: bigint;
    readonly tradeCount: bigint | null;
    readonly totalTradedValue: Decimal | null;
}
export declare class TradeOhlcvvCandleV2 {
    static readonly SCHEMA_ID = 41957;
    static readonly TEMPLATE_ID = 310;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 69;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly totalVolume: bigint;
    readonly tradeCount: bigint | null;
    readonly totalTradedValue: Decimal | null;
    constructor(value: TradeOhlcvvCandleV2Value);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): TradeOhlcvvCandleV2;
    static encodeBody(value: TradeOhlcvvCandleV2Value): Uint8Array;
}
export type PublicExport = TradeOhlcvvCandleV2;
export declare const PUBLIC_EXPORT_CODECS: Map<number, {
    readonly format: SbeFormat;
    decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): PublicExport;
}>;
//# sourceMappingURL=stream-8.d.ts.map