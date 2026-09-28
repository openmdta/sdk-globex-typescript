/** Little-endian builder for owner SBE subframes. */
export declare class WireWriter {
    readonly parts: Uint8Array[];
    length: number;
    bytes(value: Uint8Array): this;
    u8(value: number): this;
    u16(value: number): this;
    u32(value: number): this;
    f64(value: number): this;
    group(blockLength: number, count: number): this;
    data(value: Uint8Array): this;
    text(value: string): this;
    finish(): Uint8Array<ArrayBuffer>;
}
//# sourceMappingURL=wire-writer.d.ts.map