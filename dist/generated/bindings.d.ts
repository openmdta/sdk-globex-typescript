import { BidAsk, Trade, BidAskCandle, TradeCandle, BidDailyOhlc, AskDailyOhlc, TradeDailyOhlc, IexTradeAttributes, ClientTradeAttributes, type PublicExport, type SbeFormat } from "./export-blocks.js";
export type CommandName = "SNAPSHOT" | "STREAM" | "TS_RAW" | "TS_CANDLE" | "TS_RAW_STREAM" | "TS_CANDLE_STREAM";
export type BlockName = "BidAsk" | "Trade" | "BidAskCandle" | "TradeCandle" | "BidDailyOhlc" | "AskDailyOhlc" | "TradeDailyOhlc" | "IexTradeAttributes" | "ClientTradeAttributes";
export interface BlockBinding<T extends PublicExport = PublicExport> {
    readonly name: BlockName;
    readonly property: string;
    readonly format: SbeFormat;
    readonly canonicalFormat: SbeFormat | null;
    readonly internalWireId: number | null;
    readonly commands: readonly CommandName[];
    readonly codec: {
        decodeBody(source: ArrayBuffer | ArrayBufferView, offset?: number, actingVersion?: number, actingBlockLength?: number): T;
    };
}
export declare const BLOCK_BINDINGS: Readonly<Record<BlockName, BlockBinding>>;
export interface BlockValueMap {
    readonly BidAsk: BidAsk;
    readonly Trade: Trade;
    readonly BidAskCandle: BidAskCandle;
    readonly TradeCandle: TradeCandle;
    readonly BidDailyOhlc: BidDailyOhlc;
    readonly AskDailyOhlc: AskDailyOhlc;
    readonly TradeDailyOhlc: TradeDailyOhlc;
    readonly IexTradeAttributes: IexTradeAttributes;
    readonly ClientTradeAttributes: ClientTradeAttributes;
}
export interface BlockPropertyMap {
    readonly BidAsk: "bidAsk";
    readonly Trade: "trade";
    readonly BidAskCandle: "bidAskCandle";
    readonly TradeCandle: "tradeCandle";
    readonly BidDailyOhlc: "bidDailyOhlc";
    readonly AskDailyOhlc: "askDailyOhlc";
    readonly TradeDailyOhlc: "tradeDailyOhlc";
    readonly IexTradeAttributes: "iexTradeAttributes";
    readonly ClientTradeAttributes: "clientTradeAttributes";
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
export type SnapshotBlockName = "BidAsk" | "Trade" | "BidDailyOhlc" | "AskDailyOhlc" | "TradeDailyOhlc" | "IexTradeAttributes" | "ClientTradeAttributes";
export type StreamBlockName = "BidAsk" | "Trade" | "BidDailyOhlc" | "AskDailyOhlc" | "TradeDailyOhlc" | "IexTradeAttributes" | "ClientTradeAttributes";
export type TsRawBlockName = "BidAsk" | "Trade" | "BidDailyOhlc" | "AskDailyOhlc" | "TradeDailyOhlc" | "IexTradeAttributes" | "ClientTradeAttributes";
export type TsCandleBlockName = "BidAskCandle" | "TradeCandle";
export type TsRawStreamBlockName = "BidAsk" | "Trade" | "BidDailyOhlc" | "AskDailyOhlc" | "TradeDailyOhlc" | "IexTradeAttributes" | "ClientTradeAttributes";
export type TsCandleStreamBlockName = "BidAskCandle" | "TradeCandle";
export declare const BLOCK_NAMES: readonly BlockName[];
//# sourceMappingURL=bindings.d.ts.map