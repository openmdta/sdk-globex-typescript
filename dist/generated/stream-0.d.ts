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
export interface AskOhlcValue {
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly closingSize: bigint;
    readonly day: number;
    readonly flags: number;
}
export declare class AskOhlc {
    static readonly SCHEMA_ID = 41957;
    static readonly TEMPLATE_ID = 18427;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 60;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly closingSize: bigint;
    readonly day: number;
    readonly flags: number;
    constructor(value: AskOhlcValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): AskOhlc;
    static encodeBody(value: AskOhlcValue): Uint8Array;
}
export type PublicExport = AskOhlc;
export declare const PUBLIC_EXPORT_CODECS: Map<number, {
    readonly format: SbeFormat;
    decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): PublicExport;
}>;
//# sourceMappingURL=stream-0.d.ts.map