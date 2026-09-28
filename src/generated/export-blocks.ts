export interface SbeFormat { readonly schemaId: number; readonly templateId: number; readonly version: number; readonly blockLength: number; }import { AskDailyOhlc as AskDailyOhlc } from "./stream-0.js";
export { AskDailyOhlc };import { BidAsk as BidAsk } from "./stream-1.js";
export { BidAsk };import { BidAskCandle as BidAskCandle } from "./stream-2.js";
export { BidAskCandle };import { BidDailyOhlc as BidDailyOhlc } from "./stream-3.js";
export { BidDailyOhlc };export type PublicExport = AskDailyOhlc | BidAsk | BidAskCandle | BidDailyOhlc;
