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
export interface BidAskValue {
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteLevel | null;
    readonly ask: QuoteLevel | null;
    readonly quoteFlags: number | null;
}
export declare class BidAsk {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 1;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 35;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteLevel | null;
    readonly ask: QuoteLevel | null;
    readonly quoteFlags: number | null;
    constructor(value: BidAskValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): BidAsk;
    static encodeBody(value: BidAskValue): Uint8Array;
}
export interface TradeValue {
    readonly eventTimeMicros: bigint;
    readonly price: Decimal;
    readonly volume: bigint;
    readonly saleConditionFlags: number | null;
}
export declare class Trade {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 2;
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
export interface IexTradeAttributesValue {
    readonly eventTimeMicros: bigint;
    readonly tradeId: bigint;
    readonly saleConditionFlags: number | null;
    readonly eventKind: number;
}
export declare class IexTradeAttributes {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 3;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 18;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly tradeId: bigint;
    readonly saleConditionFlags: number | null;
    readonly eventKind: number;
    constructor(value: IexTradeAttributesValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): IexTradeAttributes;
    static encodeBody(value: IexTradeAttributesValue): Uint8Array;
}
export interface ClientTradeAttributesValue {
    readonly eventTimeMicros: bigint;
    readonly tradeId: bigint;
    readonly saleConditionFlags: number | null;
    readonly oddLot: number;
}
export declare class ClientTradeAttributes {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 4;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 18;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly tradeId: bigint;
    readonly saleConditionFlags: number | null;
    readonly oddLot: number;
    constructor(value: ClientTradeAttributesValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): ClientTradeAttributes;
    static encodeBody(value: ClientTradeAttributesValue): Uint8Array;
}
export interface GapValue {
    readonly fromEventTimeMicros: bigint | null;
    readonly throughEventTimeMicros: bigint | null;
}
export declare class Gap {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 5;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 16;
    static readonly format: SbeFormat;
    readonly fromEventTimeMicros: bigint | null;
    readonly throughEventTimeMicros: bigint | null;
    constructor(value: GapValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): Gap;
    static encodeBody(value: GapValue): Uint8Array;
}
export interface BidDailyOhlcValue {
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly closeLast: Decimal;
    readonly closePrevious: Decimal;
    readonly day: number;
    readonly flags: number;
}
export declare class BidDailyOhlc {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 6;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 61;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly closeLast: Decimal;
    readonly closePrevious: Decimal;
    readonly day: number;
    readonly flags: number;
    constructor(value: BidDailyOhlcValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): BidDailyOhlc;
    static encodeBody(value: BidDailyOhlcValue): Uint8Array;
}
export interface AskDailyOhlcValue {
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly closeLast: Decimal;
    readonly closePrevious: Decimal;
    readonly day: number;
    readonly flags: number;
}
export declare class AskDailyOhlc {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 7;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 61;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly closeLast: Decimal;
    readonly closePrevious: Decimal;
    readonly day: number;
    readonly flags: number;
    constructor(value: AskDailyOhlcValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): AskDailyOhlc;
    static encodeBody(value: AskDailyOhlcValue): Uint8Array;
}
export interface TradeDailyOhlcValue {
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly closeLast: Decimal;
    readonly closePrevious: Decimal;
    readonly day: number;
    readonly flags: number;
}
export declare class TradeDailyOhlc {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 8;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 61;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly closeLast: Decimal;
    readonly closePrevious: Decimal;
    readonly day: number;
    readonly flags: number;
    constructor(value: TradeDailyOhlcValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): TradeDailyOhlc;
    static encodeBody(value: TradeDailyOhlcValue): Uint8Array;
}
export interface BidAskCandleValue {
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteSideCandle | null;
    readonly ask: QuoteSideCandle | null;
    readonly quoteCount: bigint;
    readonly closingQuoteFlags: number | null;
}
export declare class BidAskCandle {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 9;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 97;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly bid: QuoteSideCandle | null;
    readonly ask: QuoteSideCandle | null;
    readonly quoteCount: bigint;
    readonly closingQuoteFlags: number | null;
    constructor(value: BidAskCandleValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): BidAskCandle;
    static encodeBody(value: BidAskCandleValue): Uint8Array;
}
export interface TradeCandleValue {
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly volume: bigint;
    readonly tradeCount: bigint;
}
export declare class TradeCandle {
    static readonly SCHEMA_ID = 701;
    static readonly TEMPLATE_ID = 10;
    static readonly VERSION = 0;
    static readonly BLOCK_LENGTH = 60;
    static readonly format: SbeFormat;
    readonly eventTimeMicros: bigint;
    readonly open: Decimal;
    readonly high: Decimal;
    readonly low: Decimal;
    readonly close: Decimal;
    readonly volume: bigint;
    readonly tradeCount: bigint;
    constructor(value: TradeCandleValue);
    static decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): TradeCandle;
    static encodeBody(value: TradeCandleValue): Uint8Array;
}
export type PublicExport = BidAsk | Trade | IexTradeAttributes | ClientTradeAttributes | Gap | BidDailyOhlc | AskDailyOhlc | TradeDailyOhlc | BidAskCandle | TradeCandle;
export declare const PUBLIC_EXPORT_CODECS: Map<number, {
    readonly format: SbeFormat;
    decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): PublicExport;
}>;
//# sourceMappingURL=export-blocks.d.ts.map