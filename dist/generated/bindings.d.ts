import { AskDailyOhlc, BidAsk, BidAskCandle, BidDailyOhlc, type PublicExport, type SbeFormat } from "./export-blocks.js";
export type CommandName = "SNAPSHOT" | "STREAM" | "TS_RAW" | "TS_CANDLE" | "TS_RAW_STREAM" | "TS_CANDLE_STREAM";
export type BlockName = "AskDailyOhlc" | "BidAsk" | "BidAskCandle" | "BidDailyOhlc";
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
export declare const BLOCK_BINDINGS: Readonly<Record<string, BlockBinding>>;
export interface BlockValueMap {
    readonly AskDailyOhlc: AskDailyOhlc;
    readonly BidAsk: BidAsk;
    readonly BidAskCandle: BidAskCandle;
    readonly BidDailyOhlc: BidDailyOhlc;
}
export interface BlockPropertyMap {
    readonly AskDailyOhlc: "askDailyOhlc";
    readonly BidAsk: "bidAsk";
    readonly BidAskCandle: "bidAskCandle";
    readonly BidDailyOhlc: "bidDailyOhlc";
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
export type SnapshotBlockName = "AskDailyOhlc" | "BidAsk" | "BidDailyOhlc";
export type StreamBlockName = "AskDailyOhlc" | "BidAsk" | "BidDailyOhlc";
export type TsRawBlockName = "AskDailyOhlc" | "BidAsk" | "BidDailyOhlc";
export type TsCandleBlockName = "BidAskCandle";
export type TsRawStreamBlockName = "AskDailyOhlc" | "BidAsk" | "BidDailyOhlc";
export type TsCandleStreamBlockName = "BidAskCandle";
export declare const BLOCK_NAMES: readonly BlockName[];
//# sourceMappingURL=bindings.d.ts.map