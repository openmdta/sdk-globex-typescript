import { decodeListingEvent } from "./generated/listing.js";
import { decodeStreamMetadataSbe } from "./stream-metadata-wire.js";
import { BLOCK_BINDINGS, } from "./generated/bindings.js";
import { WireWriter } from "./wire-writer.js";
export const WEBSOCKET_SUBPROTOCOL = "openmdta.sbe-session.v1";
export const WINDOW_SUBPROTOCOL = "openmdta.sbe-session.v2";
export const RESPONSE_WINDOW_BYTES = 8 * 1024 * 1024;
export const RESPONSE_WINDOW_COUNT = 16;
export const RESPONSE_COST_OVERHEAD = 128;
const SESSION_SCHEMA_ID = 5;
const SESSION_SCHEMA_VERSION = 0;
const MARKET_SCHEMA_ID = 102;
const MARKET_SCHEMA_VERSION = 5;
const MESSAGE_BATCH_SCHEMA_VERSION = 12;
const ADJUSTMENT_SCHEMA_VERSION = 11;
const METADATA_SCHEMA_VERSION = 13;
const METADATA_RESPONSE_SCHEMA_VERSION = 24;
const DATASET_ROUTING_SCHEMA_VERSION = 14;
const HEADER_LENGTH = 8;
const AUTH_TEMPLATE_ID = 1;
const OPEN_TEMPLATE_ID = 2;
const CANCEL_TEMPLATE_ID = 3;
const CREDIT_TEMPLATE_ID = 4;
const RESPONSE_TEMPLATE_ID = 101;
const CANCEL_RESPONSE_TEMPLATE_ID = 102;
const MESSAGE_BATCH_TEMPLATE_ID = 108;
const CATALOG_RECORD_TEMPLATE_ID = 102;
const MARKET_TEMPLATE = {
    SNAPSHOT: 1,
    STREAM: 2,
    TS_RAW: 3,
    TS_CANDLE: 4,
    CATALOG: 5,
    TS_RAW_STREAM: 6,
    TS_CANDLE_STREAM: 7,
    CATALOG_KEYFIGURES: 8,
    STREAM_METADATA: 9,
    CATALOG_SEARCH: 10,
    CATALOG_LOOKUP: 11,
    LISTING_LATEST: 12,
    SERVICE_CALL: 13,
    TS_PAGE: 14,
    FEED_LIVE: 15,
    FEED_RECOVERY: 16,
    FEED_SNAPSHOT: 17,
    CATALOG_FEED: 18,
};
export const decodeFeedControl = (response) => {
    if (response.status !== "CONTINUE" || response.message === null)
        throw new ProtocolError("feed control requires a continuing response");
    const { format, body } = response.message;
    if (format.schemaId !== MARKET_SCHEMA_ID || format.templateId !== 111 || format.version !== 18
        || format.blockLength !== 17 || body.byteLength < 21)
        throw new ProtocolError("unsupported feed control");
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const kind = view.getUint8(0);
    if (kind < 1 || kind > 3)
        throw new ProtocolError("invalid feed control kind");
    const dataset = takeVarData(body, view, 17);
    if (dataset.next !== body.byteLength)
        throw new ProtocolError("feed control contains trailing bytes");
    return {
        kind: kind === 1 ? "fence" : kind === 2 ? "gap" : "watermark",
        afterMessageId: view.getBigUint64(1, true),
        throughMessageId: view.getBigUint64(9, true),
        dataset: new TextDecoder("utf-8", { fatal: true }).decode(dataset.value),
    };
};
export const decodeFeedSnapshotHeader = (response) => {
    if (response.status !== "CONTINUE" || response.message === null)
        throw new ProtocolError("snapshot header requires a continuing response");
    const { format, body } = response.message;
    if (format.schemaId !== MARKET_SCHEMA_ID || format.templateId !== 112 || format.version !== 18
        || format.blockLength !== 8 || body.byteLength < 18)
        throw new ProtocolError("unsupported feed snapshot header");
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const group = takeGroupHeader(body, view, 8, 16);
    if (group.next + group.count * 16 > body.byteLength)
        throw new ProtocolError("feed snapshot gaps are truncated");
    const gaps = Array.from({ length: group.count }, (_, index) => ({
        afterMessageId: view.getBigUint64(group.next + index * 16, true),
        throughMessageId: view.getBigUint64(group.next + index * 16 + 8, true),
    }));
    if (gaps.some(gap => gap.afterMessageId >= gap.throughMessageId))
        throw new ProtocolError("invalid feed snapshot gap");
    const dataset = takeVarData(body, view, group.next + group.count * 16);
    if (dataset.next !== body.byteLength)
        throw new ProtocolError("feed snapshot header contains trailing bytes");
    return {
        throughMessageId: view.getBigUint64(0, true),
        gaps,
        dataset: new TextDecoder("utf-8", { fatal: true }).decode(dataset.value),
    };
};
export const decodeCatalogFeedControl = (response) => {
    if (response.status !== "CONTINUE" || !response.message)
        throw new ProtocolError("Catalog feed control is not a continuing response");
    const { format, body } = response.message;
    if (format.schemaId !== MARKET_SCHEMA_ID || format.templateId !== 113 || format.version !== 19 || format.blockLength !== 1 || body.byteLength < 5) {
        throw new ProtocolError("unsupported Catalog feed control");
    }
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const decoded = takeVarData(body, view, 1);
    if (decoded.next !== body.byteLength)
        throw new ProtocolError("Catalog feed control contains trailing bytes");
    const cursor = new TextDecoder("utf-8", { fatal: true }).decode(decoded.value);
    if (body[0] === 1 && cursor === "")
        return { kind: "snapshot_begin" };
    if (body[0] === 2 && cursor !== "")
        return { kind: "snapshot_complete", cursor };
    if (body[0] === 3 && cursor !== "")
        return { kind: "cursor", cursor };
    throw new ProtocolError("invalid Catalog feed control kind or cursor");
};
export class ProtocolError extends Error {
    constructor(message) {
        super(message);
        this.name = "ProtocolError";
    }
}
export class RequestError extends Error {
    requestId;
    constructor(requestId, message) {
        super(message);
        this.requestId = requestId;
        this.name = "RequestError";
    }
}
export const blockMask = (blocks) => {
    if (!blocks?.length)
        return 0n;
    let mask = 0n;
    for (const block of blocks) {
        const binding = BLOCK_BINDINGS[block];
        if (!binding)
            throw new ProtocolError(`unknown export block ${block}`);
        // Masks carry template IDs only; combining schemas can select a different block with the same ID.
        mask |= 1n << BigInt((binding.canonicalFormat ?? binding.format).templateId);
    }
    return mask;
};
export const encodeRequest = (request) => {
    if (request.command === "AUTH") {
        return encodeWithText(SESSION_SCHEMA_ID, SESSION_SCHEMA_VERSION, AUTH_TEMPLATE_ID, 8, request.token, (view) => {
            view.setBigUint64(HEADER_LENGTH, request.id, true);
        });
    }
    if (request.command === "CANCEL") {
        const bytes = message(SESSION_SCHEMA_ID, SESSION_SCHEMA_VERSION, CANCEL_TEMPLATE_ID, 16);
        const view = new DataView(bytes.buffer);
        view.setBigUint64(HEADER_LENGTH, request.id, true);
        view.setBigUint64(HEADER_LENGTH + 8, request.targetId, true);
        return bytes;
    }
    return encodeOpen(request.id, encodeMarketRequest(request), request.trace);
};
export const encodeCredit = (targetId, credits = 1) => {
    const bytes = message(SESSION_SCHEMA_ID, SESSION_SCHEMA_VERSION, CREDIT_TEMPLATE_ID, 12);
    const view = new DataView(bytes.buffer);
    view.setBigUint64(HEADER_LENGTH, targetId, true);
    view.setUint32(HEADER_LENGTH + 8, credits, true);
    return bytes;
};
export const encodeWindow = (targetId) => {
    const bytes = message(SESSION_SCHEMA_ID, 1, 5, 20);
    const view = new DataView(bytes.buffer);
    view.setBigUint64(HEADER_LENGTH, targetId, true);
    view.setUint32(HEADER_LENGTH + 8, RESPONSE_WINDOW_COUNT, true);
    view.setUint32(HEADER_LENGTH + 12, RESPONSE_WINDOW_BYTES, true);
    view.setUint32(HEADER_LENGTH + 16, 5 * 1024 * 1024 - 128, true);
    return bytes;
};
export const encodeRelease = (targetId, consumedBytes) => {
    const bytes = message(SESSION_SCHEMA_ID, 1, 6, 16);
    const view = new DataView(bytes.buffer);
    view.setBigUint64(HEADER_LENGTH, targetId, true);
    view.setUint32(HEADER_LENGTH + 8, 1, true);
    view.setUint32(HEADER_LENGTH + 12, consumedBytes, true);
    return bytes;
};
/** Decode one bounded transport batch; all body slices share the original frame. */
export const splitResponseBatch = (response) => {
    const message = response.message;
    if (message?.format.schemaId !== SESSION_SCHEMA_ID || message.format.templateId !== 103)
        return [response];
    const { body, format } = message;
    if (format.version !== 1 || format.blockLength !== 0 || body.byteLength < 6 || body[0] !== 8 || body[1] !== 0)
        throw new ProtocolError("invalid response batch");
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const count = view.getUint32(2, true);
    if (count === 0 || count > 64)
        throw new ProtocolError("invalid response batch count");
    const messages = [];
    let offset = 6;
    for (let index = 0; index < count; index++) {
        if (offset + 12 > body.byteLength)
            throw new ProtocolError("truncated response batch");
        const format = { schemaId: view.getUint16(offset, true), templateId: view.getUint16(offset + 2, true),
            version: view.getUint16(offset + 4, true), blockLength: view.getUint16(offset + 6, true) };
        const size = view.getUint32(offset + 8, true);
        offset += 12;
        if (size > body.byteLength - offset || size < format.blockLength
            || (format.schemaId === SESSION_SCHEMA_ID && format.templateId === 103))
            throw new ProtocolError("invalid nested response body");
        messages.push({ ...response, message: { format, body: body.subarray(offset, offset + size) } });
        offset += size;
    }
    if (offset !== body.byteLength)
        throw new ProtocolError("response batch has trailing bytes");
    return messages;
};
export const decodeResponse = (source) => {
    const bytes = asBytes(source);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const { templateId, blockLength } = verifyHeader(bytes, view, SESSION_SCHEMA_ID, SESSION_SCHEMA_VERSION);
    if (templateId === CANCEL_RESPONSE_TEMPLATE_ID) {
        if (blockLength !== 17 || bytes.byteLength !== HEADER_LENGTH + blockLength) {
            throw new ProtocolError("cancel response has an invalid length");
        }
        const cancelled = view.getUint8(HEADER_LENGTH + 16);
        if (cancelled !== 0 && cancelled !== 1)
            throw new ProtocolError(`invalid cancelled flag ${cancelled}`);
        return {
            kind: "cancel",
            requestId: view.getBigUint64(HEADER_LENGTH, true),
            targetId: view.getBigUint64(HEADER_LENGTH + 8, true),
            cancelled: cancelled === 1,
        };
    }
    if (templateId !== RESPONSE_TEMPLATE_ID || blockLength !== 17) {
        throw new ProtocolError(`unknown response template ${templateId}`);
    }
    let offset = HEADER_LENGTH + blockLength;
    const body = takeVarData(bytes, view, offset);
    offset = body.next;
    const error = takeVarData(bytes, view, offset);
    if (error.next !== bytes.byteLength)
        throw new ProtocolError("response contains trailing bytes");
    const format = {
        schemaId: view.getUint16(HEADER_LENGTH + 9, true),
        templateId: view.getUint16(HEADER_LENGTH + 11, true),
        version: view.getUint16(HEADER_LENGTH + 13, true),
        blockLength: view.getUint16(HEADER_LENGTH + 15, true),
    };
    const status = decodeStatus(view.getUint8(HEADER_LENGTH + 8));
    const message = format.schemaId === 0 && format.templateId === 0 && format.version === 0 && format.blockLength === 0 && body.value.byteLength === 0
        ? null
        : { format, body: body.value };
    if (status === "CONTINUE" && message === null && view.getBigUint64(HEADER_LENGTH, true) !== 1n) {
        throw new ProtocolError("data response has no SBE message");
    }
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let errorText;
    try {
        errorText = decoder.decode(error.value);
    }
    catch (cause) {
        throw new ProtocolError(`response error is not UTF-8: ${String(cause)}`);
    }
    if (status !== "ERROR" && errorText)
        throw new ProtocolError("non-error response contains an error message");
    return {
        kind: "response",
        requestId: view.getBigUint64(HEADER_LENGTH, true),
        status,
        message,
        error: errorText,
    };
};
export const decodeBatch = (response, selector) => {
    if (response.status !== "CONTINUE" || response.message === null) {
        throw new ProtocolError("only continuing data responses can be decoded as batches");
    }
    const { format: outer, body } = response.message;
    if (outer.schemaId !== MARKET_SCHEMA_ID
        || outer.templateId !== MESSAGE_BATCH_TEMPLATE_ID
        || outer.version !== MESSAGE_BATCH_SCHEMA_VERSION
        || outer.blockLength !== 1
        || body.byteLength < outer.blockLength) {
        throw new ProtocolError(`unsupported market-data batch ${outer.schemaId}/${outer.templateId} version ${outer.version}`);
    }
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const phase = decodePhase(view.getUint8(0));
    let offset = outer.blockLength;
    const messageGroup = takeGroupHeader(body, view, offset, 14);
    offset = messageGroup.next;
    if (offset + messageGroup.count * 14 > body.byteLength)
        throw new ProtocolError("market-data messages are truncated");
    const messageRows = Array.from({ length: messageGroup.count }, (_, index) => {
        const row = offset + index * 14;
        return {
            messageId: view.getBigUint64(row, true),
            firstField: view.getUint32(row + 8, true),
            fieldCount: view.getUint16(row + 12, true),
        };
    });
    offset += messageGroup.count * 14;
    const fieldGroup = takeGroupHeader(body, view, offset, 25);
    offset = fieldGroup.next;
    if (offset + fieldGroup.count * 25 > body.byteLength)
        throw new ProtocolError("market-data fields are truncated");
    const fieldRows = Array.from({ length: fieldGroup.count }, (_, index) => {
        const row = offset + index * 25;
        const clear = view.getUint8(row + 16);
        if (clear !== 0 && clear !== 1)
            throw new ProtocolError(`invalid field clear flag ${clear}`);
        return {
            format: {
                schemaId: view.getUint16(row, true),
                templateId: view.getUint16(row + 2, true),
                version: view.getUint16(row + 4, true),
                blockLength: view.getUint16(row + 6, true),
            },
            eventTimeMicros: view.getBigUint64(row + 8, true),
            clear: clear === 1,
            payloadOffset: view.getUint32(row + 17, true),
            payloadLength: view.getUint32(row + 21, true),
        };
    });
    offset += fieldGroup.count * 25;
    const gapGroup = takeGroupHeader(body, view, offset, 16);
    offset = gapGroup.next;
    if (offset + gapGroup.count * 16 > body.byteLength)
        throw new ProtocolError("market-data gaps are truncated");
    const gaps = Array.from({ length: gapGroup.count }, (_, index) => {
        const row = offset + index * 16;
        const from = view.getBigUint64(row, true);
        const through = view.getBigUint64(row + 8, true);
        return {
            fromEventTimeMicros: from === 0xffffffffffffffffn ? null : from,
            throughEventTimeMicros: through === 0xffffffffffffffffn ? null : through,
        };
    });
    offset += gapGroup.count * 16;
    const datasetRecordKey = takeVarData(body, view, offset);
    offset = datasetRecordKey.next;
    const dataset = takeVarData(body, view, offset);
    offset = dataset.next;
    const payload = takeVarData(body, view, offset);
    if (payload.next !== body.byteLength)
        throw new ProtocolError("market-data batch contains trailing bytes");
    if (messageRows.reduce((count, row) => count + row.fieldCount, 0) !== fieldRows.length) {
        throw new ProtocolError("market-data message field ranges do not cover the field table");
    }
    let nextField = 0;
    const messages = messageRows.map(row => {
        if (row.firstField !== nextField || row.firstField + row.fieldCount > fieldRows.length) {
            throw new ProtocolError("market-data message has an invalid field range");
        }
        nextField += row.fieldCount;
        const fields = {};
        const entries = [];
        for (const field of fieldRows.slice(row.firstField, row.firstField + row.fieldCount)) {
            const binding = Object.values(BLOCK_BINDINGS).find(candidate => (candidate.format.schemaId === field.format.schemaId && candidate.format.templateId === field.format.templateId)
                || (candidate.canonicalFormat?.schemaId === field.format.schemaId && candidate.canonicalFormat.templateId === field.format.templateId));
            if (!binding)
                throw new ProtocolError(`unknown export format ${field.format.schemaId}/${field.format.templateId}`);
            const canonical = binding.canonicalFormat?.schemaId === field.format.schemaId
                && binding.canonicalFormat.templateId === field.format.templateId;
            const expected = canonical ? binding.canonicalFormat : binding.format;
            if (field.format.version !== expected.version || field.format.blockLength !== expected.blockLength) {
                throw new ProtocolError(`unsupported ${binding.name} version ${field.format.version} blockLength ${field.format.blockLength}`);
            }
            if (Object.hasOwn(fields, binding.property))
                throw new ProtocolError(`message contains ${binding.name} more than once`);
            const end = field.payloadOffset + field.payloadLength;
            if (end > payload.value.byteLength || (!field.clear && field.payloadLength !== field.format.blockLength)) {
                throw new ProtocolError(`${binding.name} payload is outside the batch payload`);
            }
            if (field.clear && field.payloadLength !== 0)
                throw new ProtocolError(`${binding.name} clear carries a payload`);
            let body = payload.value;
            let bodyOffset = field.payloadOffset;
            if (canonical && !field.clear) {
                body = new Uint8Array(binding.format.blockLength);
                new DataView(body.buffer).setBigUint64(0, field.eventTimeMicros, true);
                body.set(payload.value.subarray(field.payloadOffset, end), 8);
                bodyOffset = 0;
            }
            const value = field.clear ? null : binding.codec.decodeBody(body, bodyOffset);
            fields[binding.property] = value;
            entries.push(Object.freeze({ name: binding.property, value }));
        }
        const frozenEntries = Object.freeze(entries);
        return Object.freeze({
            messageId: row.messageId,
            fields: Object.freeze(fields),
            *fieldIterator() { yield* frozenEntries; },
        });
    });
    const decoder = new TextDecoder("utf-8", { fatal: true });
    try {
        return {
            requestId: response.requestId,
            phase,
            selector,
            datasetRecord: Object.freeze({
                dataset: decoder.decode(dataset.value),
                datasetRecordKey: decoder.decode(datasetRecordKey.value),
            }),
            messages,
            gaps,
        };
    }
    catch (cause) {
        throw new ProtocolError(`batch text is not UTF-8: ${String(cause)}`);
    }
};
export const decodeKeyfiguresResult = (response) => {
    const message = response.message;
    if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID
        || message.format.templateId !== 103 || message.format.version !== 6 || message.format.blockLength !== 0) {
        throw new ProtocolError("unsupported Catalog keyfigures result");
    }
    const body = message.body;
    if (body.byteLength < 4 || new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true) !== body.byteLength - 4) {
        throw new ProtocolError("malformed Catalog keyfigures result length");
    }
    try {
        return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body.subarray(4)));
    }
    catch {
        throw new ProtocolError("malformed Catalog keyfigures result JSON");
    }
};
export const decodeServiceCallResult = (response) => {
    const message = response.message;
    if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID
        || message.format.templateId !== 109 || message.format.version !== 16 || message.format.blockLength !== 0) {
        throw new ProtocolError("unsupported service result");
    }
    const body = message.body;
    if (body.byteLength < 4 || body.byteLength > 4 * 1024 * 1024 + 4
        || new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true) !== body.byteLength - 4) {
        throw new ProtocolError("invalid service result length");
    }
    try {
        return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body.subarray(4)));
    }
    catch {
        throw new ProtocolError("invalid service result JSON");
    }
};
export const decodeTimeseriesPageResult = (response) => {
    const message = response.message;
    if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID
        || message.format.templateId !== 110 || message.format.version !== 17 || message.format.blockLength !== 17) {
        throw new ProtocolError("unsupported timeseries page result");
    }
    const body = message.body;
    if (body.byteLength < 21 || body.byteLength > 8192 + 21)
        throw new ProtocolError("invalid timeseries page result length");
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const from = view.getBigUint64(0, true), through = view.getBigUint64(8, true);
    const status = body[16];
    const cursor = takeVarData(body, view, 17);
    if (cursor.next !== body.byteLength || from > through || status > 3)
        throw new ProtocolError("invalid timeseries page result");
    const nextCursor = cursor.value.byteLength ? new TextDecoder("utf-8", { fatal: true }).decode(cursor.value) : null;
    return { from, through, nextCursor, status: status };
};
export const decodeCatalogSearchResult = (response) => {
    const message = response.message;
    if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID
        || message.format.templateId !== 105 || message.format.version !== 26 || message.format.blockLength !== 0) {
        throw new ProtocolError("unsupported Catalog search result");
    }
    const body = message.body;
    if (body.byteLength < 4 || new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true) !== body.byteLength - 4) {
        throw new ProtocolError("malformed Catalog search result length");
    }
    return body.subarray(4);
};
export const decodeCatalogLookupResult = (response) => {
    const message = response.message;
    if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID
        || message.format.templateId !== 106 || message.format.version !== 25 || message.format.blockLength !== 0) {
        throw new ProtocolError("unsupported Catalog lookup result");
    }
    const body = message.body;
    if (body.byteLength < 4 || new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true) !== body.byteLength - 4) {
        throw new ProtocolError("malformed Catalog lookup result length");
    }
    return body.subarray(4);
};
export const decodeCatalogRecord = (response) => {
    if (response.status !== "CONTINUE" || response.message === null) {
        throw new ProtocolError("only continuing responses can be decoded as Catalog records");
    }
    const { format, body } = response.message;
    if (format.schemaId !== MARKET_SCHEMA_ID
        || format.templateId !== CATALOG_RECORD_TEMPLATE_ID
        || format.version > MARKET_SCHEMA_VERSION
        || format.blockLength !== 30
        || body.byteLength < format.blockLength + 6) {
        throw new ProtocolError(`unsupported Catalog record ${format.schemaId}/${format.templateId} version ${format.version}`);
    }
    const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const exists = decodeBoolean(view.getUint8(1), "exists");
    const lifecyclePresent = decodeBoolean(view.getUint8(2), "lifecyclePresent");
    const listingValue = view.getUint8(3);
    const activityValue = view.getUint8(4);
    const visible = decodeBoolean(view.getUint8(5), "visible");
    const nullU64 = 18446744073709551615n;
    const hideAt = view.getBigUint64(14, true);
    const hiddenAt = view.getBigUint64(22, true);
    let lifecycle = null;
    if (lifecyclePresent) {
        const listing = listingValue === 0 ? "NOT_LISTED" : listingValue === 1 ? "LISTED" : null;
        const activity = activityValue === 0 ? "UNKNOWN" : activityValue === 1 ? "ACTIVE" : activityValue === 2 ? "INACTIVE" : null;
        if (listing === null || (listing === "NOT_LISTED" && activityValue !== 0) || (listing === "LISTED" && activity === null)) {
            throw new ProtocolError(`invalid Catalog lifecycle ${listingValue}/${activityValue}`);
        }
        lifecycle = {
            listing,
            activity: listing === "LISTED" ? activity : null,
            visible,
            effectiveTimeMicros: view.getBigUint64(6, true),
            hideAtMicros: hideAt === nullU64 ? null : hideAt,
            hiddenAtUnixSeconds: hiddenAt === nullU64 ? null : hiddenAt,
        };
    }
    let offset = format.blockLength;
    const group = takeGroupHeader(body, view, offset, 6);
    offset = group.next;
    const fields = [];
    const decoder = new TextDecoder("utf-8", { fatal: true });
    for (let index = 0; index < group.count; index += 1) {
        if (offset + 6 > body.byteLength)
            throw new ProtocolError("Catalog field block is truncated");
        const wireId = view.getUint16(offset, true);
        const fixed = view.getUint32(offset + 2, true);
        offset += 6;
        const label = takeVarData(body, view, offset);
        offset = label.next;
        const subfield = takeVarData(body, view, offset);
        offset = subfield.next;
        const payload = takeVarData(body, view, offset);
        offset = payload.next;
        try {
            const decodedSubfield = decoder.decode(subfield.value);
            fields.push({
                label: decoder.decode(label.value),
                subfield: decodedSubfield || null,
                wireId,
                fixedLength: fixed === 0xffff_ffff ? null : fixed,
                payload: payload.value,
            });
        }
        catch (cause) {
            throw new ProtocolError(`Catalog field text is not UTF-8: ${String(cause)}`);
        }
    }
    const catalog = takeVarData(body, view, offset);
    offset = catalog.next;
    const identifier = takeVarData(body, view, offset);
    offset = identifier.next;
    const recordIdentifier = takeVarData(body, view, offset);
    if (recordIdentifier.next !== body.byteLength)
        throw new ProtocolError("Catalog record contains trailing bytes");
    try {
        return {
            requestId: response.requestId,
            phase: decodePhase(view.getUint8(0)),
            catalog: decoder.decode(catalog.value),
            identifier: decoder.decode(identifier.value),
            recordIdentifier: decoder.decode(recordIdentifier.value),
            exists,
            lifecycle,
            fields,
        };
    }
    catch (cause) {
        throw new ProtocolError(`Catalog record text is not UTF-8: ${String(cause)}`);
    }
};
export const decodeCatalogFields = (record, descriptors, requireEveryField = false) => {
    const selected = new Map(descriptors.map((descriptor) => [descriptor.label, descriptor]));
    const decoded = Object.create(null);
    for (const field of record.fields) {
        const descriptor = selected.get(field.label);
        if (!descriptor) {
            if (requireEveryField)
                decoded[field.label] = field.payload;
            continue;
        }
        if ((descriptor.wireId !== undefined && field.wireId !== descriptor.wireId)
            || (descriptor.fixedLength !== undefined && field.fixedLength !== descriptor.fixedLength)
            || (field.fixedLength !== null && field.payload.byteLength !== field.fixedLength)) {
            throw new ProtocolError(`Catalog field ${field.label} has incompatible wire metadata`);
        }
        const property = descriptor.property ?? field.label;
        if (descriptor.multiple) {
            if (!field.subfield)
                throw new ProtocolError(`Catalog field ${field.label} requires a subfield`);
            const values = (decoded[property] ??= Object.create(null));
            if (Object.hasOwn(values, field.subfield))
                throw new ProtocolError("duplicate Catalog subfield");
            values[field.subfield] = descriptor.decode(field.payload);
        }
        else {
            if (field.subfield !== null || Object.hasOwn(decoded, property))
                throw new ProtocolError(`Catalog field ${field.label} requires a multiple descriptor`);
            decoded[property] = descriptor.decode(field.payload);
        }
    }
    return decoded;
};
const encodeMarketRequest = (request) => {
    if (request.command === "CATALOG_FEED") {
        const fields = request.fields.map(value => new TextEncoder().encode(value));
        const catalog = new TextEncoder().encode(request.catalog);
        const cursor = new TextEncoder().encode(request.cursor ?? "");
        const tailLength = 6 + fields.reduce((sum, value) => sum + 4 + value.byteLength, 0)
            + 8 + catalog.byteLength + cursor.byteLength;
        const bytes = message(MARKET_SCHEMA_ID, 19, MARKET_TEMPLATE.CATALOG_FEED, 0, tailLength);
        const view = new DataView(bytes.buffer);
        let offset = putGroupHeader(bytes, view, HEADER_LENGTH, fields);
        view.setUint32(offset, catalog.byteLength, true);
        bytes.set(catalog, offset + 4);
        offset += 4 + catalog.byteLength;
        view.setUint32(offset, cursor.byteLength, true);
        bytes.set(cursor, offset + 4);
        return bytes;
    }
    if (request.command === "FEED_LIVE" || request.command === "FEED_SNAPSHOT") {
        const dataset = new TextEncoder().encode(request.dataset);
        const quality = new TextEncoder().encode(request.quality);
        const bytes = message(MARKET_SCHEMA_ID, 18, MARKET_TEMPLATE[request.command], 8, 8 + dataset.length + quality.length);
        const view = new DataView(bytes.buffer);
        view.setBigUint64(HEADER_LENGTH, request.blockMask, true);
        view.setUint32(HEADER_LENGTH + 8, dataset.length, true);
        bytes.set(dataset, HEADER_LENGTH + 12);
        const qualityOffset = HEADER_LENGTH + 12 + dataset.length;
        view.setUint32(qualityOffset, quality.length, true);
        bytes.set(quality, qualityOffset + 4);
        return bytes;
    }
    if (request.command === "FEED_RECOVERY") {
        const dataset = new TextEncoder().encode(request.dataset);
        const quality = new TextEncoder().encode(request.quality);
        const bytes = message(MARKET_SCHEMA_ID, 18, MARKET_TEMPLATE.FEED_RECOVERY, 24, 8 + dataset.length + quality.length);
        const view = new DataView(bytes.buffer);
        view.setBigUint64(HEADER_LENGTH, request.blockMask, true);
        view.setBigUint64(HEADER_LENGTH + 8, request.afterMessageId, true);
        view.setBigUint64(HEADER_LENGTH + 16, request.throughMessageId, true);
        view.setUint32(HEADER_LENGTH + 24, dataset.length, true);
        bytes.set(dataset, HEADER_LENGTH + 28);
        const qualityOffset = HEADER_LENGTH + 28 + dataset.length;
        view.setUint32(qualityOffset, quality.length, true);
        bytes.set(quality, qualityOffset + 4);
        return bytes;
    }
    if (request.command === "TS_PAGE") {
        const strings = [request.selector, request.dataset ?? "", request.quality ?? "", request.cursor ?? ""]
            .map(value => new TextEncoder().encode(value));
        if (strings[0].byteLength > 1024 || strings[1].byteLength > 256 || strings[2].byteLength > 8 || strings[3].byteLength > 2048
            || (request.boundary === undefined) === (request.cursor === undefined)) {
            throw new ProtocolError("invalid timeseries page parameters");
        }
        const bytes = message(MARKET_SCHEMA_ID, 20, MARKET_TEMPLATE.TS_PAGE, 39, 16 + strings.reduce((sum, value) => sum + value.byteLength, 0));
        const view = new DataView(bytes.buffer);
        view.setBigUint64(HEADER_LENGTH, request.blockMask, true);
        view.setBigUint64(HEADER_LENGTH + 8, request.resolutionMicros, true);
        view.setBigUint64(HEADER_LENGTH + 16, request.boundary ?? 0n, true);
        view.setBigUint64(HEADER_LENGTH + 24, request.guard ?? 0n, true);
        view.setUint32(HEADER_LENGTH + 32, request.limit, true);
        view.setUint8(HEADER_LENGTH + 36, Number(request.boundary !== undefined) | Number(request.guard !== undefined) << 1);
        view.setUint8(HEADER_LENGTH + 37, Number(request.order === "desc"));
        view.setUint8(HEADER_LENGTH + 38, Number(request.adjustment === "split"));
        let offset = HEADER_LENGTH + 39;
        for (const value of strings) {
            view.setUint32(offset, value.byteLength, true);
            bytes.set(value, offset + 4);
            offset += 4 + value.byteLength;
        }
        return bytes;
    }
    if (request.command === "SNAPSHOT" || request.command === "STREAM") {
        const expression = new TextEncoder().encode(request.expression);
        const adjustment = new TextEncoder().encode(request.adjustment);
        const dataset = new TextEncoder().encode(request.dataset ?? "");
        const bytes = message(MARKET_SCHEMA_ID, DATASET_ROUTING_SCHEMA_VERSION, MARKET_TEMPLATE[request.command], 8, 12 + expression.byteLength + adjustment.byteLength + dataset.byteLength);
        const view = new DataView(bytes.buffer);
        view.setBigUint64(HEADER_LENGTH, request.blockMask, true);
        let offset = HEADER_LENGTH + 8;
        view.setUint32(offset, expression.byteLength, true);
        bytes.set(expression, offset + 4);
        offset += 4 + expression.byteLength;
        view.setUint32(offset, adjustment.byteLength, true);
        bytes.set(adjustment, offset + 4);
        offset += 4 + adjustment.byteLength;
        view.setUint32(offset, dataset.byteLength, true);
        bytes.set(dataset, offset + 4);
        return bytes;
    }
    if (request.command === "TS_RAW" || request.command === "TS_RAW_STREAM") {
        const expression = new TextEncoder().encode(request.expression);
        const quality = new TextEncoder().encode(request.quality ?? "");
        const adjustment = new TextEncoder().encode(request.adjustment);
        const dataset = new TextEncoder().encode(request.dataset ?? "");
        const bytes = message(MARKET_SCHEMA_ID, DATASET_ROUTING_SCHEMA_VERSION, MARKET_TEMPLATE[request.command], 28, 16 + expression.byteLength + quality.byteLength + adjustment.byteLength + dataset.byteLength);
        const view = new DataView(bytes.buffer);
        view.setBigUint64(HEADER_LENGTH, request.blockMask, true);
        view.setBigUint64(HEADER_LENGTH + 8, request.from, true);
        view.setBigUint64(HEADER_LENGTH + 16, request.through, true);
        view.setUint32(HEADER_LENGTH + 24, request.maxRows, true);
        let offset = HEADER_LENGTH + 28;
        view.setUint32(offset, expression.byteLength, true);
        bytes.set(expression, offset + 4);
        offset += 4 + expression.byteLength;
        view.setUint32(offset, quality.byteLength, true);
        bytes.set(quality, offset + 4);
        offset += 4 + quality.byteLength;
        view.setUint32(offset, adjustment.byteLength, true);
        bytes.set(adjustment, offset + 4);
        offset += 4 + adjustment.byteLength;
        view.setUint32(offset, dataset.byteLength, true);
        bytes.set(dataset, offset + 4);
        return bytes;
    }
    if (request.command === "CATALOG_KEYFIGURES") {
        const strings = [request.catalog, request.action, request.parameters, request.contractFingerprint].map(value => new TextEncoder().encode(value));
        strings.push(new TextEncoder().encode(request.priceAgeMode ?? ""));
        const bytes = message(MARKET_SCHEMA_ID, 7, MARKET_TEMPLATE.CATALOG_KEYFIGURES, 8, strings.reduce((n, value) => n + 4 + value.byteLength, 0));
        const view = new DataView(bytes.buffer);
        view.setBigUint64(HEADER_LENGTH, request.priceCutoffMs ?? 0xffffffffffffffffn, true);
        let offset = HEADER_LENGTH + 8;
        for (const value of strings) {
            view.setUint32(offset, value.byteLength, true);
            bytes.set(value, offset + 4);
            offset += 4 + value.byteLength;
        }
        return bytes;
    }
    if (request.command === "LISTING_LATEST") {
        const values = [request.dataset, request.quality, request.key].map(value => new TextEncoder().encode(value));
        if (!request.blocks.length || request.blocks.length > 64 || !request.blocks.every(id => Number.isInteger(id) && id >= 0 && id <= 65535)
            || values[0].byteLength > 256 || values[2].byteLength > 1024)
            throw new ProtocolError("invalid listing selector");
        const bytes = message(MARKET_SCHEMA_ID, 21, MARKET_TEMPLATE.LISTING_LATEST, 0, 6 + request.blocks.length * 2 + 12 + values.reduce((sum, value) => sum + value.byteLength, 0));
        const view = new DataView(bytes.buffer);
        view.setUint16(HEADER_LENGTH, 2, true);
        view.setUint32(HEADER_LENGTH + 2, request.blocks.length, true);
        let offset = HEADER_LENGTH + 6;
        for (const id of request.blocks) {
            view.setUint16(offset, id, true);
            offset += 2;
        }
        for (const value of values) {
            view.setUint32(offset, value.byteLength, true);
            bytes.set(value, offset + 4);
            offset += 4 + value.byteLength;
        }
        return bytes;
    }
    if (request.command === "SERVICE_CALL") {
        const values = [request.serviceId, request.serviceCommand, request.contractFingerprint, request.mutationId ?? "", request.inputJson]
            .map(value => new TextEncoder().encode(value));
        if (!values[0]?.length || values[0].length > 256 || !values[1]?.length || values[1].length > 128
            || !/^[a-f0-9]{64}$/.test(request.contractFingerprint) || (values[3]?.length ?? 0) > 128
            || (values[4]?.length ?? 0) > 64 * 1024)
            throw new ProtocolError("invalid service request");
        const bytes = message(MARKET_SCHEMA_ID, 16, MARKET_TEMPLATE.SERVICE_CALL, 8, values.reduce((sum, value) => sum + 4 + value.byteLength, 0));
        const view = new DataView(bytes.buffer);
        view.setBigUint64(HEADER_LENGTH, request.deadlineUnixMillis, true);
        let offset = HEADER_LENGTH + 8;
        for (const value of values) {
            view.setUint32(offset, value.byteLength, true);
            bytes.set(value, offset + 4);
            offset += 4 + value.byteLength;
        }
        return bytes;
    }
    if (request.command === "STREAM_METADATA") {
        const values = [request.dataset, request.quality].map(value => new TextEncoder().encode(value));
        const bytes = message(MARKET_SCHEMA_ID, METADATA_SCHEMA_VERSION, MARKET_TEMPLATE.STREAM_METADATA, 0, values.reduce((sum, value) => sum + 4 + value.byteLength, 0));
        const view = new DataView(bytes.buffer);
        let offset = HEADER_LENGTH;
        for (const value of values) {
            view.setUint32(offset, value.byteLength, true);
            bytes.set(value, offset + 4);
            offset += 4 + value.byteLength;
        }
        return bytes;
    }
    if (request.command === "CATALOG_LOOKUP") {
        const encoder = new TextEncoder();
        const parameters = request.parameters;
        const expressionMode = parameters.expression !== undefined;
        const dimensions = Object.entries(parameters.dimensions ?? {}).map(([name, values]) => ({ name: encoder.encode(name), values: values.map(value => encoder.encode(value)) }));
        const catalog = encoder.encode(request.catalog);
        const expression = encoder.encode(parameters.expression ?? "");
        const cursor = encoder.encode(parameters.cursor ?? "");
        if (!catalog.length || catalog.length > 256 || dimensions.length > 256 || dimensions.some(dimension => dimension.values.length > 256)
            || (expressionMode && dimensions.length) || (!expressionMode && expression.length)
            || (parameters.limit !== undefined && (!Number.isSafeInteger(parameters.limit) || parameters.limit < 0)))
            throw new RangeError("invalid Catalog lookup parameters");
        const tailLength = 6 + dimensions.reduce((sum, dimension) => sum + 6 + dimension.values.reduce((length, value) => length + 4 + value.length, 0) + 4 + dimension.name.length, 0)
            + 12 + catalog.length + expression.length + cursor.length;
        const bytes = message(MARKET_SCHEMA_ID, 23, MARKET_TEMPLATE.CATALOG_LOOKUP, 10, tailLength);
        if (bytes.length > 16_896)
            throw new RangeError("Catalog lookup request exceeds limit");
        const view = new DataView(bytes.buffer);
        view.setUint8(HEADER_LENGTH, expressionMode ? 1 : 0);
        view.setUint8(HEADER_LENGTH + 1, Number(parameters.cursor !== undefined) | (Number(parameters.limit !== undefined) << 1));
        view.setBigUint64(HEADER_LENGTH + 2, BigInt(parameters.limit ?? 0), true);
        let offset = HEADER_LENGTH + 10;
        view.setUint16(offset, 0, true);
        view.setUint32(offset + 2, dimensions.length, true);
        offset += 6;
        for (const dimension of dimensions) {
            view.setUint16(offset, 0, true);
            view.setUint32(offset + 2, dimension.values.length, true);
            offset += 6;
            for (const value of dimension.values) {
                view.setUint32(offset, value.length, true);
                bytes.set(value, offset + 4);
                offset += 4 + value.length;
            }
            view.setUint32(offset, dimension.name.length, true);
            bytes.set(dimension.name, offset + 4);
            offset += 4 + dimension.name.length;
        }
        for (const value of [catalog, expression, cursor]) {
            view.setUint32(offset, value.byteLength, true);
            bytes.set(value, offset + 4);
            offset += 4 + value.byteLength;
        }
        return bytes;
    }
    if (request.command === "CATALOG_SEARCH") {
        const parameters = request.parameters;
        if (typeof request.catalog !== "string" || Object.keys(parameters).some(name => ![
            "expression", "text", "filters", "ranges", "facets", "keys", "expected_incarnation",
            "cursor", "limit", "autocomplete", "describe", "trace",
        ].includes(name)))
            throw new RangeError("invalid Catalog search parameters");
        const catalog = new TextEncoder().encode(request.catalog);
        const expression = new TextEncoder().encode(parameters.expression ?? "");
        const filters = Object.entries(parameters.filters ?? {}).sort(([left], [right]) => left.localeCompare(right));
        const ranges = parameters.ranges ?? [];
        const facets = parameters.facets ?? [];
        const keys = parameters.keys ?? null;
        const limit = parameters.limit ?? 0;
        if (!catalog.length || catalog.length > 256 || expression.length > 4096 || filters.length > 1024
            || ranges.length > 1024 || facets.length > 1024 || (keys?.length ?? 0) > 4096
            || !Array.isArray(ranges) || !Array.isArray(facets) || (keys !== null && !Array.isArray(keys))
            || facets.some(facet => typeof facet !== "string") || keys?.some(key => typeof key !== "string")
            || (parameters.text !== undefined && typeof parameters.text !== "string")
            || (parameters.expected_incarnation !== undefined && typeof parameters.expected_incarnation !== "string")
            || (parameters.cursor !== undefined && typeof parameters.cursor !== "string")
            || (parameters.expression !== undefined && typeof parameters.expression !== "string")
            || (parameters.autocomplete !== undefined && typeof parameters.autocomplete !== "boolean")
            || (parameters.describe !== undefined && typeof parameters.describe !== "boolean")
            || !Number.isSafeInteger(limit) || limit < 0 || limit > 0xffffffff
            || (expression.length > 0 && keys !== null))
            throw new RangeError("invalid Catalog search parameters");
        const query = new WireWriter();
        query.u16(7).u16(5).u16(7).u16(5);
        query.u32(limit).u8(parameters.autocomplete ? 1 : 0).u8(parameters.describe ? 1 : 0);
        query.u8(Number(keys !== null) | (Number(parameters.expected_incarnation !== undefined) << 1) | (Number(parameters.cursor !== undefined) << 2));
        query.group(0, filters.length);
        for (const [field, input] of filters) {
            const values = typeof input === "string" ? [input] : input;
            if (!Array.isArray(values) || values.length > 16_384 || values.some(value => typeof value !== "string"))
                throw new RangeError("invalid Catalog search filter");
            query.group(0, values.length);
            for (const value of values)
                query.text(value);
            query.text(field);
        }
        query.group(49, ranges.length);
        for (const range of ranges) {
            const bounds = [range.gt, range.ge, range.lt, range.le];
            if (typeof range.field !== "string" || !range.field || Object.keys(range).some(name => !["field", "gt", "ge", "lt", "le"].includes(name))
                || (range.gt !== undefined && range.ge !== undefined) || (range.lt !== undefined && range.le !== undefined)
                || bounds.some(value => value !== undefined && !Number.isFinite(value)))
                throw new RangeError("invalid Catalog search range");
            query.u8(bounds.reduce((mask, value, index) => mask | (value === undefined ? 0 : 1 << index), 0));
            for (const value of bounds)
                query.f64(value ?? 0);
            query.f64(0).f64(0).text(range.field);
        }
        query.group(0, facets.length);
        for (const facet of facets)
            query.text(facet);
        query.group(0, keys?.length ?? 0);
        for (const key of keys ?? [])
            query.text(key);
        query.text(request.catalog).text(parameters.text ?? "").text(parameters.expected_incarnation ?? "").text(parameters.cursor ?? "");
        const frame = query.finish();
        if (frame.byteLength > 16_384)
            throw new RangeError("Catalog search request exceeds 16 KiB");
        const bytes = message(MARKET_SCHEMA_ID, 27, MARKET_TEMPLATE.CATALOG_SEARCH, 0, 8 + frame.byteLength + expression.byteLength);
        const view = new DataView(bytes.buffer);
        view.setUint32(HEADER_LENGTH, frame.byteLength, true);
        bytes.set(frame, HEADER_LENGTH + 4);
        const expressionOffset = HEADER_LENGTH + 4 + frame.byteLength;
        view.setUint32(expressionOffset, expression.byteLength, true);
        bytes.set(expression, expressionOffset + 4);
        return bytes;
    }
    if (request.command === "CATALOG") {
        const catalog = new TextEncoder().encode(request.catalog);
        const identifiers = request.identifiers.map((value) => new TextEncoder().encode(value));
        const fields = request.fields.map((value) => new TextEncoder().encode(value));
        const tailLength = 6 + identifiers.reduce((sum, value) => sum + 4 + value.byteLength, 0)
            + 6 + fields.reduce((sum, value) => sum + 4 + value.byteLength, 0)
            + 4 + catalog.byteLength;
        const bytes = message(MARKET_SCHEMA_ID, MARKET_SCHEMA_VERSION, MARKET_TEMPLATE.CATALOG, 0, tailLength);
        const view = new DataView(bytes.buffer);
        let offset = HEADER_LENGTH;
        offset = putGroupHeader(bytes, view, offset, identifiers);
        offset = putGroupHeader(bytes, view, offset, fields);
        view.setUint32(offset, catalog.byteLength, true);
        bytes.set(catalog, offset + 4);
        return bytes;
    }
    if (request.command !== "TS_CANDLE" && request.command !== "TS_CANDLE_STREAM") {
        throw new ProtocolError(`unknown market-data command ${request.command}`);
    }
    const expression = new TextEncoder().encode(request.expression);
    const quality = new TextEncoder().encode(request.quality ?? "");
    const adjustment = new TextEncoder().encode(request.adjustment);
    const dataset = new TextEncoder().encode(request.dataset ?? "");
    const bytes = message(MARKET_SCHEMA_ID, DATASET_ROUTING_SCHEMA_VERSION, MARKET_TEMPLATE[request.command], request.command === "TS_CANDLE" ? 32 : 36, 16 + expression.byteLength + quality.byteLength + adjustment.byteLength + dataset.byteLength);
    const view = new DataView(bytes.buffer);
    view.setBigUint64(HEADER_LENGTH, request.blockMask, true);
    view.setBigUint64(HEADER_LENGTH + 8, request.from, true);
    view.setBigUint64(HEADER_LENGTH + 16, request.through, true);
    view.setBigUint64(HEADER_LENGTH + 24, request.cadenceMicros, true);
    if (request.command === "TS_CANDLE_STREAM") {
        view.setUint32(HEADER_LENGTH + 32, request.updateIntervalMillis, true);
    }
    let offset = HEADER_LENGTH + (request.command === "TS_CANDLE" ? 32 : 36);
    view.setUint32(offset, expression.byteLength, true);
    bytes.set(expression, offset + 4);
    offset += 4 + expression.byteLength;
    view.setUint32(offset, quality.byteLength, true);
    bytes.set(quality, offset + 4);
    offset += 4 + quality.byteLength;
    view.setUint32(offset, adjustment.byteLength, true);
    bytes.set(adjustment, offset + 4);
    offset += 4 + adjustment.byteLength;
    view.setUint32(offset, dataset.byteLength, true);
    bytes.set(dataset, offset + 4);
    return bytes;
};
const encodeOpen = (requestId, application, trace) => {
    if (trace && (trace.traceId.byteLength !== 16 || trace.parentSpanId.byteLength !== 8)) {
        throw new TypeError("traceId must contain 16 bytes and parentSpanId must contain 8 bytes");
    }
    const app = new DataView(application.buffer, application.byteOffset, application.byteLength);
    const blockLength = app.getUint16(0, true);
    const body = application.subarray(HEADER_LENGTH);
    const bytes = message(SESSION_SCHEMA_ID, SESSION_SCHEMA_VERSION, OPEN_TEMPLATE_ID, 40, 4 + body.byteLength);
    const view = new DataView(bytes.buffer);
    view.setBigUint64(HEADER_LENGTH, requestId, true);
    if (trace) {
        bytes.set(trace.traceId, HEADER_LENGTH + 8);
        bytes.set(trace.parentSpanId, HEADER_LENGTH + 24);
    }
    view.setUint16(HEADER_LENGTH + 32, app.getUint16(4, true), true);
    view.setUint16(HEADER_LENGTH + 34, app.getUint16(2, true), true);
    view.setUint16(HEADER_LENGTH + 36, app.getUint16(6, true), true);
    view.setUint16(HEADER_LENGTH + 38, blockLength, true);
    const offset = HEADER_LENGTH + 40;
    view.setUint32(offset, body.byteLength, true);
    bytes.set(body, offset + 4);
    return bytes;
};
const encodeWithText = (schemaId, version, templateId, blockLength, text, fixed) => {
    const value = typeof text === "string" ? new TextEncoder().encode(text) : text;
    const bytes = message(schemaId, version, templateId, blockLength, 4 + value.byteLength);
    const view = new DataView(bytes.buffer);
    fixed(view);
    const offset = HEADER_LENGTH + blockLength;
    view.setUint32(offset, value.byteLength, true);
    bytes.set(value, offset + 4);
    return bytes;
};
const message = (schemaId, version, templateId, blockLength, tailLength = 0) => {
    const bytes = new Uint8Array(HEADER_LENGTH + blockLength + tailLength);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, blockLength, true);
    view.setUint16(2, templateId, true);
    view.setUint16(4, schemaId, true);
    view.setUint16(6, version, true);
    return bytes;
};
const asBytes = (source) => source instanceof ArrayBuffer
    ? new Uint8Array(source)
    : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
const verifyHeader = (bytes, view, expectedSchema, expectedVersion) => {
    if (bytes.byteLength < HEADER_LENGTH)
        throw new ProtocolError("response has no SBE header");
    const blockLength = view.getUint16(0, true);
    const templateId = view.getUint16(2, true);
    const schemaId = view.getUint16(4, true);
    const version = view.getUint16(6, true);
    if (schemaId !== expectedSchema || version !== expectedVersion) {
        throw new ProtocolError(`unsupported response schema ${schemaId} version ${version}`);
    }
    if (bytes.byteLength < HEADER_LENGTH + blockLength)
        throw new ProtocolError("response fixed block is truncated");
    return { templateId, blockLength };
};
const takeVarData = (bytes, view, offset) => {
    if (offset + 4 > bytes.byteLength)
        throw new ProtocolError("variable-data length is truncated");
    const length = view.getUint32(offset, true);
    const start = offset + 4;
    const next = start + length;
    if (next > bytes.byteLength)
        throw new ProtocolError("variable-data value is truncated");
    return { value: bytes.subarray(start, next), next };
};
const putGroupHeader = (bytes, view, offset, values) => {
    view.setUint16(offset, 0, true);
    view.setUint32(offset + 2, values.length, true);
    let next = offset + 6;
    for (const value of values) {
        view.setUint32(next, value.byteLength, true);
        bytes.set(value, next + 4);
        next += 4 + value.byteLength;
    }
    return next;
};
const takeGroupHeader = (bytes, view, offset, expectedBlockLength) => {
    if (offset + 6 > bytes.byteLength)
        throw new ProtocolError("group header is truncated");
    const blockLength = view.getUint16(offset, true);
    if (blockLength !== expectedBlockLength) {
        throw new ProtocolError(`group block length is ${blockLength}, expected ${expectedBlockLength}`);
    }
    return { count: view.getUint32(offset + 2, true), next: offset + 6 };
};
const decodeStatus = (value) => {
    if (value === 1)
        return "CONTINUE";
    if (value === 2)
        return "DONE";
    if (value === 3)
        return "ERROR";
    throw new ProtocolError(`unknown response status ${value}`);
};
const decodePhase = (value) => {
    if (value === 1)
        return "SNAPSHOT";
    if (value === 2)
        return "UPDATE";
    throw new ProtocolError(`unknown response phase ${value}`);
};
const decodeBoolean = (value, name) => {
    if (value === 0)
        return false;
    if (value === 1)
        return true;
    throw new ProtocolError(`${name} flag is ${value}`);
};
export function decodeStreamMetadata(response) {
    if (!response.message)
        throw new ProtocolError("missing Stream metadata response");
    const { format, body } = response.message;
    if (format.schemaId !== MARKET_SCHEMA_ID || format.templateId !== 104 || format.version !== METADATA_RESPONSE_SCHEMA_VERSION || format.blockLength !== 1 || body.byteLength < 1) {
        throw new ProtocolError("unsupported Stream metadata response");
    }
    try {
        return decodeStreamMetadataSbe(body);
    }
    catch (error) {
        throw new ProtocolError(error instanceof Error ? error.message : "invalid Stream metadata");
    }
}
export function decodeListingResponse(response) {
    const message = response.message;
    if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID || message.format.templateId !== 107 || message.format.version !== 21 || message.format.blockLength !== 2)
        throw new ProtocolError("unsupported listing response");
    return decodeListingEvent(message.body);
}
//# sourceMappingURL=protocol.js.map