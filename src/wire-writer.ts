/** Little-endian builder for owner SBE subframes. */
export class WireWriter {
  readonly parts: Uint8Array[] = [];
  length = 0;

  bytes(value: Uint8Array): this {
    this.parts.push(value);
    this.length += value.byteLength;
    return this;
  }

  u8(value: number): this {
    const bytes = new Uint8Array(1);
    bytes[0] = value;
    return this.bytes(bytes);
  }

  u16(value: number): this {
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return this.bytes(bytes);
  }

  u32(value: number): this {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return this.bytes(bytes);
  }

  f64(value: number): this {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, value, true);
    return this.bytes(bytes);
  }

  group(blockLength: number, count: number): this {
    this.u16(blockLength);
    return this.u32(count);
  }

  data(value: Uint8Array): this {
    this.u32(value.byteLength);
    return this.bytes(value);
  }

  text(value: string): this {
    const encoded = new TextEncoder().encode(value);
    return this.data(encoded);
  }

  finish(): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(this.length);
    let offset = 0;
    for (const part of this.parts) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    return bytes;
  }
}
