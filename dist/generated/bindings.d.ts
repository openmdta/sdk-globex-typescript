import { AskOhlc, BidAsk, BidAskCandle, BidOhlc, Trade, TradeOhlcvv, TradeOhlcvvCandle, type PublicExport, type SbeFormat } from "./export-blocks.js";
export type CommandName = "SNAPSHOT" | "STREAM" | "TS_RAW" | "TS_CANDLE" | "TS_RAW_STREAM" | "TS_CANDLE_STREAM";
export type BlockName = "AskOhlc" | "BidAsk" | "BidAskCandle" | "BidOhlc" | "Trade" | "TradeOhlcvv" | "TradeOhlcvvCandle";
export interface BlockBinding<T extends PublicExport = PublicExport> {
    readonly name: BlockName;
    readonly semantic: string;
    readonly layout: string;
    readonly property: string;
    readonly format: SbeFormat;
    readonly canonicalFormat: SbeFormat | null;
    readonly internalWireId: number | null;
    readonly commands: readonly CommandName[];
    readonly codec: {
        decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): T;
    };
}
export declare const BLOCK_BINDINGS: Readonly<Record<string, BlockBinding>>;
export interface BlockValueMap {
    readonly AskOhlc: AskOhlc;
    readonly BidAsk: BidAsk;
    readonly BidAskCandle: BidAskCandle;
    readonly BidOhlc: BidOhlc;
    readonly Trade: Trade;
    readonly TradeOhlcvv: TradeOhlcvv;
    readonly TradeOhlcvvCandle: TradeOhlcvvCandle;
}
export interface BlockPropertyMap {
    readonly AskOhlc: "askOhlc";
    readonly BidAsk: "bidAsk";
    readonly BidAskCandle: "bidAskCandle";
    readonly BidOhlc: "bidOhlc";
    readonly Trade: "trade";
    readonly TradeOhlcvv: "tradeOhlcvv";
    readonly TradeOhlcvvCandle: "tradeOhlcvvCandle";
}
export type BlockValue<N extends BlockName> = BlockValueMap[N];
export type BlockPropertyName<N extends BlockName> = BlockPropertyMap[N];
export type MarketDataFields<N extends BlockName> = {
    readonly [K in N as BlockPropertyMap[K]]?: BlockValue<K> | null;
};
export type MarketDataField<N extends BlockName> = {
    [K in N]: {
        readonly name: BlockPropertyMap[K];
        readonly value: BlockValue<K> | null;
    };
}[N];
export type SnapshotBlockName = "AskOhlc" | "BidAsk" | "BidOhlc" | "Trade" | "TradeOhlcvv";
export type StreamBlockName = "AskOhlc" | "BidAsk" | "BidOhlc" | "Trade" | "TradeOhlcvv";
export type TsRawBlockName = "AskOhlc" | "BidAsk" | "BidOhlc" | "Trade" | "TradeOhlcvv";
export type TsCandleBlockName = "BidAskCandle" | "TradeOhlcvvCandle";
export type TsRawStreamBlockName = "AskOhlc" | "BidAsk" | "BidOhlc" | "Trade" | "TradeOhlcvv";
export type TsCandleStreamBlockName = "BidAskCandle" | "TradeOhlcvvCandle";
export declare const BLOCK_NAMES: readonly BlockName[];
//# sourceMappingURL=bindings.d.ts.map