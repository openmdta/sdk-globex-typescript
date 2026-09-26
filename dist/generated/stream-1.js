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
export class QuoteSideCandle {
    open;
    high;
    low;
    close;
    closingSize;
    constructor(value) {
        this.open = value.open;
        this.high = value.high;
        this.low = value.low;
        this.close = value.close;
        this.closingSize = value.closingSize;
    }
}
export class BidAskCandle {
    static SCHEMA_ID = 100;
    static TEMPLATE_ID = 12;
    static VERSION = 3;
    static BLOCK_LENGTH = 97;
    static format = { schemaId: this.SCHEMA_ID, templateId: this.TEMPLATE_ID, version: this.VERSION, blockLength: this.BLOCK_LENGTH };
    eventTimeMicros;
    bid;
    ask;
    quoteCount;
    closingQuoteCondition;
    constructor(value) {
        this.eventTimeMicros = value.eventTimeMicros;
        this.bid = value.bid;
        this.ask = value.ask;
        this.quoteCount = value.quoteCount;
        this.closingQuoteCondition = value.closingQuoteCondition;
    }
    static decodeBody(source, offset = 0, actingVersion = this.VERSION, actingBlockLength = this.BLOCK_LENGTH) {
        const view = viewOf(source);
        requireBytes(view, offset, actingBlockLength);
        return new this({
            eventTimeMicros: view.getBigUint64(offset + 0, true),
            bid: (() => {
                if (view.getBigInt64(offset + 8 + 0 + 0, true) === -9223372036854775808n && view.getInt8(offset + 8 + 0 + 8) === -128)
                    return null;
                return new QuoteSideCandle({
                    open: new Decimal({
                        mantissa: view.getBigInt64(offset + 8 + 0 + 0, true),
                        exponent: view.getInt8(offset + 8 + 0 + 8),
                    }),
                    high: new Decimal({
                        mantissa: view.getBigInt64(offset + 8 + 9 + 0, true),
                        exponent: view.getInt8(offset + 8 + 9 + 8),
                    }),
                    low: new Decimal({
                        mantissa: view.getBigInt64(offset + 8 + 18 + 0, true),
                        exponent: view.getInt8(offset + 8 + 18 + 8),
                    }),
                    close: new Decimal({
                        mantissa: view.getBigInt64(offset + 8 + 27 + 0, true),
                        exponent: view.getInt8(offset + 8 + 27 + 8),
                    }),
                    closingSize: view.getUint32(offset + 8 + 36, true),
                });
            })(),
            ask: (() => {
                if (view.getBigInt64(offset + 48 + 0 + 0, true) === -9223372036854775808n && view.getInt8(offset + 48 + 0 + 8) === -128)
                    return null;
                return new QuoteSideCandle({
                    open: new Decimal({
                        mantissa: view.getBigInt64(offset + 48 + 0 + 0, true),
                        exponent: view.getInt8(offset + 48 + 0 + 8),
                    }),
                    high: new Decimal({
                        mantissa: view.getBigInt64(offset + 48 + 9 + 0, true),
                        exponent: view.getInt8(offset + 48 + 9 + 8),
                    }),
                    low: new Decimal({
                        mantissa: view.getBigInt64(offset + 48 + 18 + 0, true),
                        exponent: view.getInt8(offset + 48 + 18 + 8),
                    }),
                    close: new Decimal({
                        mantissa: view.getBigInt64(offset + 48 + 27 + 0, true),
                        exponent: view.getInt8(offset + 48 + 27 + 8),
                    }),
                    closingSize: view.getUint32(offset + 48 + 36, true),
                });
            })(),
            quoteCount: view.getBigUint64(offset + 88, true),
            closingQuoteCondition: (() => { const decoded = view.getUint8(offset + 96); return decoded === 255 ? null : decoded; })(),
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
                view.setBigInt64(0 + 8 + 0 + 0, encoded.open.mantissa, true);
                view.setInt8(0 + 8 + 0 + 8, encoded.open.exponent);
                view.setBigInt64(0 + 8 + 9 + 0, encoded.high.mantissa, true);
                view.setInt8(0 + 8 + 9 + 8, encoded.high.exponent);
                view.setBigInt64(0 + 8 + 18 + 0, encoded.low.mantissa, true);
                view.setInt8(0 + 8 + 18 + 8, encoded.low.exponent);
                view.setBigInt64(0 + 8 + 27 + 0, encoded.close.mantissa, true);
                view.setInt8(0 + 8 + 27 + 8, encoded.close.exponent);
                view.setUint32(0 + 8 + 36, encoded.closingSize, true);
            }
        }
        {
            const encoded = value.ask;
            if (encoded === null) {
                view.setBigInt64(0 + 48 + 0 + 0, -9223372036854775808n, true);
                view.setInt8(0 + 48 + 0 + 8, -128);
            }
            else {
                view.setBigInt64(0 + 48 + 0 + 0, encoded.open.mantissa, true);
                view.setInt8(0 + 48 + 0 + 8, encoded.open.exponent);
                view.setBigInt64(0 + 48 + 9 + 0, encoded.high.mantissa, true);
                view.setInt8(0 + 48 + 9 + 8, encoded.high.exponent);
                view.setBigInt64(0 + 48 + 18 + 0, encoded.low.mantissa, true);
                view.setInt8(0 + 48 + 18 + 8, encoded.low.exponent);
                view.setBigInt64(0 + 48 + 27 + 0, encoded.close.mantissa, true);
                view.setInt8(0 + 48 + 27 + 8, encoded.close.exponent);
                view.setUint32(0 + 48 + 36, encoded.closingSize, true);
            }
        }
        view.setBigUint64(0 + 88, value.quoteCount, true);
        view.setUint8(0 + 96, value.closingQuoteCondition ?? 255);
        return bytes;
    }
}
export const PUBLIC_EXPORT_CODECS = new Map([
    [BidAskCandle.TEMPLATE_ID, BidAskCandle],
]);
//# sourceMappingURL=stream-1.js.map