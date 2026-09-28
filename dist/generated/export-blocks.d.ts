export interface SbeFormat {
    readonly schemaId: number;
    readonly templateId: number;
    readonly version: number;
    readonly blockLength: number;
}
import { AskOhlc as AskOhlc } from "./stream-0.js";
export { AskOhlc };
import { BidAsk as BidAsk } from "./stream-1.js";
export { BidAsk };
import { BidAskCandle as BidAskCandle } from "./stream-2.js";
export { BidAskCandle };
import { BidOhlc as BidOhlc } from "./stream-3.js";
export { BidOhlc };
export type PublicExport = AskOhlc | BidAsk | BidAskCandle | BidOhlc;
//# sourceMappingURL=export-blocks.d.ts.map