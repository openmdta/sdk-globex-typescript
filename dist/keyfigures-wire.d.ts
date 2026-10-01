interface FieldContract {
    readonly columnId: number;
    readonly name: string;
    readonly type: string;
    readonly nullable: boolean;
    readonly multiple?: boolean;
}
interface BlockContract {
    readonly semantic: string;
    readonly projection: Readonly<Record<string, string>>;
}
export interface KeyfiguresWireContract {
    readonly catalog: string;
    readonly fingerprint: string;
    readonly fields: readonly FieldContract[];
    readonly blocks: readonly BlockContract[];
}
type Contract = KeyfiguresWireContract;
/**
 * Reassemble one Keyfigures result from its ordered owner frames. A search result
 * is zero or more row chunks followed by its summary; other actions are one frame.
 * The projection is identical to the Gateway's HTTPS JSON.
 */
export declare class KeyfiguresWireDecoder {
    #private;
    readonly action: "schema" | "instrument" | "search";
    readonly contract: Contract;
    constructor(action: "schema" | "instrument" | "search", contract: Contract);
    /** Return undefined after a row chunk and the complete projection after the final frame. */
    push(bytes: Uint8Array): unknown;
}
export {};
//# sourceMappingURL=keyfigures-wire.d.ts.map