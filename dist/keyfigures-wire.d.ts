interface FieldContract {
    readonly columnId: number;
    readonly name: string;
    readonly type: string;
    readonly nullable: boolean;
}
interface BlockContract {
    readonly semantic: string;
    readonly projection: Readonly<Record<string, string>>;
}
interface Contract {
    readonly catalog: string;
    readonly fingerprint: string;
    readonly fields: readonly FieldContract[];
    readonly blocks: readonly BlockContract[];
}
export declare function decodeKeyfiguresWire(action: "schema" | "instrument" | "search", bytes: Uint8Array, contract: Contract): unknown;
export {};
//# sourceMappingURL=keyfigures-wire.d.ts.map