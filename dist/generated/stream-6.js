const viewOf = (source) => source instanceof ArrayBuffer
    ? new DataView(source)
    : new DataView(source.buffer, source.byteOffset, source.byteLength);
const requireBytes = (view, offset, length) => {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + length > view.byteLength) {
        throw new RangeError(`SBE block needs ${length} bytes at offset ${offset}, but view has ${view.byteLength}`);
    }
};
export class Decimal {
    mantissa;
    exponent;
    constructor(value) {
        this.mantissa = value.mantissa;
        this.exponent = value.exponent;
    }
    isNegative() {
        return this.mantissa < 0n;
    }
    compareTo(other) {
        const commonExponent = Math.min(this.exponent, other.exponent);
        const left = this.mantissa * 10n ** BigInt(this.exponent - commonExponent);
        const right = other.mantissa * 10n ** BigInt(other.exponent - commonExponent);
        return left < right ? -1 : left > right ? 1 : 0;
    }
    equals(other) {
        return this.compareTo(other) === 0;
    }
    toParts() {
        return { mantissa: this.mantissa, exponent: this.exponent };
    }
    to(Target) {
        return new Target(this.toString());
    }
    toNumber() {
        return Number(this.toString());
    }
    toString() {
        const negative = this.mantissa < 0n;
        const digits = (negative ? -this.mantissa : this.mantissa).toString();
        if (this.exponent >= 0)
            return `${negative ? "-" : ""}${digits}${"0".repeat(this.exponent)}`;
        const places = -this.exponent;
        const padded = digits.padStart(places + 1, "0");
        const split = padded.length - places;
        return `${negative ? "-" : ""}${padded.slice(0, split)}.${padded.slice(split)}`;
    }
    toLocaleString(locales, options = {}) {
        const scale = Math.max(0, -this.exponent);
        const minimumFractionDigits = options.minimumFractionDigits
            ?? (options.maximumFractionDigits === undefined ? scale : Math.min(scale, options.maximumFractionDigits));
        const maximumFractionDigits = options.maximumFractionDigits ?? Math.max(scale, minimumFractionDigits);
        const formatter = new Intl.NumberFormat(locales, { ...options, minimumFractionDigits, maximumFractionDigits });
        // ECMA-402 accepts exact StringNumericLiteral input; older TypeScript Intl declarations omit that overload.
        const formatExact = formatter.format;
        return formatExact(this.toString());
    }
}
export class TradeOhlcvvCandle {
    static SCHEMA_ID = 41957;
    static TEMPLATE_ID = 49382;
    static VERSION = 0;
    static BLOCK_LENGTH = 69;
    static format = { schemaId: this.SCHEMA_ID, templateId: this.TEMPLATE_ID, version: this.VERSION, blockLength: this.BLOCK_LENGTH };
    eventTimeMicros;
    open;
    high;
    low;
    close;
    totalVolume;
    tradeCount;
    totalTradedValue;
    constructor(value) {
        this.eventTimeMicros = value.eventTimeMicros;
        this.open = value.open;
        this.high = value.high;
        this.low = value.low;
        this.close = value.close;
        this.totalVolume = value.totalVolume;
        this.tradeCount = value.tradeCount;
        this.totalTradedValue = value.totalTradedValue;
    }
    static decodeBody(source, offset = 0, actingVersion = this.VERSION, actingBlockLength = this.BLOCK_LENGTH) {
        const view = viewOf(source);
        requireBytes(view, offset, actingBlockLength);
        return new this({
            eventTimeMicros: view.getBigUint64(offset + 0, true),
            open: new Decimal({
                mantissa: view.getBigInt64(offset + 8 + 0, true),
                exponent: view.getInt8(offset + 8 + 8),
            }),
            high: new Decimal({
                mantissa: view.getBigInt64(offset + 17 + 0, true),
                exponent: view.getInt8(offset + 17 + 8),
            }),
            low: new Decimal({
                mantissa: view.getBigInt64(offset + 26 + 0, true),
                exponent: view.getInt8(offset + 26 + 8),
            }),
            close: new Decimal({
                mantissa: view.getBigInt64(offset + 35 + 0, true),
                exponent: view.getInt8(offset + 35 + 8),
            }),
            totalVolume: view.getBigUint64(offset + 44, true),
            tradeCount: view.getBigUint64(offset + 52, true),
            totalTradedValue: new Decimal({
                mantissa: view.getBigInt64(offset + 60 + 0, true),
                exponent: view.getInt8(offset + 60 + 8),
            }),
        });
    }
    static encodeBody(value) {
        const bytes = new Uint8Array(this.BLOCK_LENGTH);
        const view = new DataView(bytes.buffer);
        view.setBigUint64(0 + 0, value.eventTimeMicros, true);
        view.setBigInt64(0 + 8 + 0, value.open.mantissa, true);
        view.setInt8(0 + 8 + 8, value.open.exponent);
        view.setBigInt64(0 + 17 + 0, value.high.mantissa, true);
        view.setInt8(0 + 17 + 8, value.high.exponent);
        view.setBigInt64(0 + 26 + 0, value.low.mantissa, true);
        view.setInt8(0 + 26 + 8, value.low.exponent);
        view.setBigInt64(0 + 35 + 0, value.close.mantissa, true);
        view.setInt8(0 + 35 + 8, value.close.exponent);
        view.setBigUint64(0 + 44, value.totalVolume, true);
        view.setBigUint64(0 + 52, value.tradeCount, true);
        view.setBigInt64(0 + 60 + 0, value.totalTradedValue.mantissa, true);
        view.setInt8(0 + 60 + 8, value.totalTradedValue.exponent);
        return bytes;
    }
}
export const PUBLIC_EXPORT_CODECS = new Map([
    [TradeOhlcvvCandle.TEMPLATE_ID, TradeOhlcvvCandle],
]);
//# sourceMappingURL=stream-6.js.map