import { ProtocolError } from "./protocol.js";
/** Bounded, little-endian reader for declared owner SBE frames. */
export class WireReader {
    bytes;
    view;
    offset = 0;
    constructor(bytes) {
        this.bytes = bytes;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    take(length) {
        if (length < 0 || length > this.bytes.byteLength - this.offset)
            throw new ProtocolError("truncated SBE owner frame");
        const part = this.bytes.subarray(this.offset, this.offset + length);
        this.offset += length;
        return part;
    }
    u8() {
        const position = this.offset;
        this.take(1);
        return this.view.getUint8(position);
    }
    u16() {
        const position = this.offset;
        this.take(2);
        return this.view.getUint16(position, true);
    }
    u32() {
        const position = this.offset;
        this.take(4);
        return this.view.getUint32(position, true);
    }
    u64() {
        const position = this.offset;
        this.take(8);
        return this.view.getBigUint64(position, true);
    }
    f64() {
        const position = this.offset;
        this.take(8);
        return this.view.getFloat64(position, true);
    }
    data() {
        const length = this.u32();
        return this.take(length);
    }
    text() {
        try {
            return new TextDecoder("utf-8", { fatal: true }).decode(this.data());
        }
        catch (error) {
            if (error instanceof ProtocolError)
                throw error;
            throw new ProtocolError("invalid SBE owner text");
        }
    }
    group(blockLength) {
        const actual = this.u16();
        const count = this.u32();
        if (actual !== blockLength || count > this.bytes.byteLength)
            throw new ProtocolError("invalid SBE owner group");
        return count;
    }
    finish() {
        if (this.offset !== this.bytes.byteLength)
            throw new ProtocolError("trailing SBE owner bytes");
    }
}
//# sourceMappingURL=wire-reader.js.map