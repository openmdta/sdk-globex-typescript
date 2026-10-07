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
export interface TradeValue {
    readonly eventTimeMicros: bigint;
    readonly price: Decimal;
    readonly volume: bigint;
    readonly saleConditionFlags: number | null;
}
export declare class Trade {
    static readonly SCHEMA_ID = 41957;
    static readonly TEMPLATE_ID = 3822;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 26;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly price: Decimal;
    readonly volume: bigint;
    readonly saleConditionFlags: number | null;
    constructor(value: TradeValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): Trade;
    static encodeBody(value: TradeValue): Uint8Array;
}
export type PublicExport = Trade;
export declare const PUBLIC_EXPORT_CODECS: Map<number, {
    readonly format: SbeFormat;
    decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): PublicExport;
}>;
//# sourceMappingURL=stream-5.d.ts.map