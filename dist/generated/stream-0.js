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
export class QuoteLevel {
    price;
    size;
    constructor(value) {
        this.price = value.price;
        this.size = value.size;
    }
}
export class BidAsk {
    static SCHEMA_ID = 100;
    static TEMPLATE_ID = 10;
    static VERSION = 3;
    static BLOCK_LENGTH = 35;
    static format = { schemaId: this.SCHEMA_ID, templateId: this.TEMPLATE_ID, version: this.VERSION, blockLength: this.BLOCK_LENGTH };
    eventTimeMicros;
    bid;
    ask;
    quoteCondition;
    constructor(value) {
        this.eventTimeMicros = value.eventTimeMicros;
        this.bid = value.bid;
        this.ask = value.ask;
        this.quoteCondition = value.quoteCondition;
    }
    static decodeBody(source, offset = 0, actingVersion = this.VERSION, actingBlockLength = this.BLOCK_LENGTH) {
        const view = viewOf(source);
        requireBytes(view, offset, actingBlockLength);
        return new this({
            eventTimeMicros: view.getBigUint64(offset + 0, true),
            bid: (() => {
                if (view.getBigInt64(offset + 8 + 0 + 0, true) === -9223372036854775808n && view.getInt8(offset + 8 + 0 + 8) === -128)
                    return null;
                return new QuoteLevel({
                    price: new Decimal({
                        mantissa: view.getBigInt64(offset + 8 + 0 + 0, true),
                        exponent: view.getInt8(offset + 8 + 0 + 8),
                    }),
                    size: view.getUint32(offset + 8 + 9, true),
                });
            })(),
            ask: (() => {
                if (view.getBigInt64(offset + 21 + 0 + 0, true) === -9223372036854775808n && view.getInt8(offset + 21 + 0 + 8) === -128)
                    return null;
                return new QuoteLevel({
                    price: new Decimal({
                        mantissa: view.getBigInt64(offset + 21 + 0 + 0, true),
                        exponent: view.getInt8(offset + 21 + 0 + 8),
                    }),
                    size: view.getUint32(offset + 21 + 9, true),
                });
            })(),
            quoteCondition: (() => { const decoded = view.getUint8(offset + 34); return decoded === 255 ? null : decoded; })(),
        });
    }
    static encodeBody(value) {
        const bytes = new Uint8Array(this.BLOCK_LENGTH);
        const view = new DataView(bytes.buffer);
        view.setBigUint64(0 + 0, value.eventTimeMicros, true);
        {
            const encoded = value.bid;
            if (encoded === null) {
                view.setBigInt64(0 + 8 + 0 + 0, -9223372036854775808n, true);
                view.setInt8(0 + 8 + 0 + 8, -128);
            }
            else {
                view.setBigInt64(0 + 8 + 0 + 0, encoded.price.mantissa, true);
                view.setInt8(0 + 8 + 0 + 8, encoded.price.exponent);
                view.setUint32(0 + 8 + 9, encoded.size, true);
            }
        }
        {
            const encoded = value.ask;
            if (encoded === null) {
                view.setBigInt64(0 + 21 + 0 + 0, -9223372036854775808n, true);
                view.setInt8(0 + 21 + 0 + 8, -128);
            }
            else {
                view.setBigInt64(0 + 21 + 0 + 0, encoded.price.mantissa, true);
                view.setInt8(0 + 21 + 0 + 8, encoded.price.exponent);
                view.setUint32(0 + 21 + 9, encoded.size, true);
            }
        }
        view.setUint8(0 + 34, value.quoteCondition ?? 255);
        return bytes;
    }
}
export const PUBLIC_EXPORT_CODECS = new Map([
    [BidAsk.TEMPLATE_ID, BidAsk],
]);
//# sourceMappingURL=stream-0.js.map