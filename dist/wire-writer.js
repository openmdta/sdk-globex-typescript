/** Little-endian builder for owner SBE subframes. */
export class WireWriter {
    parts = [];
    length = 0;
    bytes(value) {
        this.parts.push(value);
        this.length += value.byteLength;
        return this;
    }
    u8(value) {
        const bytes = new Uint8Array(1);
        bytes[0] = value;
        return this.bytes(bytes);
    }
    u16(value) {
        const bytes = new Uint8Array(2);
        new DataView(bytes.buffer).setUint16(0, value, true);
        return this.bytes(bytes);
    }
    u32(value) {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setUint32(0, value, true);
        return this.bytes(bytes);
    }
    f64(value) {
        const bytes = new Uint8Array(8);
        new DataView(bytes.buffer).setFloat64(0, value, true);
        return this.bytes(bytes);
    }
    group(blockLength, count) {
        this.u16(blockLength);
        return this.u32(count);
    }
    data(value) {
        this.u32(value.byteLength);
        return this.bytes(value);
    }
    text(value) {
        const encoded = new TextEncoder().encode(value);
        return this.data(encoded);
    }
    finish() {
        const bytes = new Uint8Array(this.length);
        let offset = 0;
        for (const part of this.parts) {
            bytes.set(part, offset);
            offset += part.byteLength;
        }
        return bytes;
    }
}
//# sourceMappingURL=wire-writer.js.map