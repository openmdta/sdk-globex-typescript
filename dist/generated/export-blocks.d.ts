export interface SbeFormat {
    readonly schemaId: number;
    readonly templateId: number;
    readonly version: number;
    readonly blockLength: number;
}
import { BidAsk as BidAsk } from "./stream-0.js";
export { BidAsk };
import { BidAskCandle as BidAskCandle } from "./stream-1.js";
export { BidAskCandle };
export type PublicExport = BidAsk | BidAskCandle;
//# sourceMappingURL=export-blocks.d.ts.map