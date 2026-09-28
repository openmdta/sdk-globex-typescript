/** Bounded, little-endian reader for declared owner SBE frames. */
export declare class WireReader {
    readonly bytes: Uint8Array;
    readonly view: DataView;
    offset: number;
    constructor(bytes: Uint8Array);
    take(length: number): Uint8Array;
    u8(): number;
    u16(): number;
    u32(): number;
    u64(): bigint;
    f64(): number;
    data(): Uint8Array;
    text(): string;
    group(blockLength: number): number;
    finish(): void;
}
//# sourceMappingURL=wire-reader.d.ts.map