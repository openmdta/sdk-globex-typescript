import {decodeListingEvent, type ListingEvent} from "./generated/listing.js";
import { decodeStreamMetadataJson, type StreamMetadata } from "./generated/activity.js";
import {
  BLOCK_BINDINGS,
  type BlockName,
  type MarketDataField,
  type MarketDataFields,
} from "./generated/bindings.js";
import type { SbeFormat } from "./generated/export-blocks.js";
import type { CatalogFieldDescriptor, CatalogDescriptorValue } from "./catalog.js";
import type { MarketSelector } from "./selector.js";

export const WEBSOCKET_SUBPROTOCOL = "openmdta.sbe-session.v1";
const SESSION_SCHEMA_ID = 5;
const SESSION_SCHEMA_VERSION = 0;
const MARKET_SCHEMA_ID = 102;
const MARKET_SCHEMA_VERSION = 5;
const MESSAGE_BATCH_SCHEMA_VERSION = 12;
const ADJUSTMENT_SCHEMA_VERSION = 11;
const METADATA_SCHEMA_VERSION = 13;
const DATASET_ROUTING_SCHEMA_VERSION = 14;
const HEADER_LENGTH = 8;
const AUTH_TEMPLATE_ID = 1;
const OPEN_TEMPLATE_ID = 2;
const CANCEL_TEMPLATE_ID = 3;
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
} as const;

export type Request =
  | { readonly command: "LISTING_LATEST"; readonly id: bigint; readonly parameters: string; readonly trace?: TraceContext }
  | { readonly command: "CATALOG_LOOKUP"; readonly id: bigint; readonly catalog: string; readonly parameters: string; readonly trace?: TraceContext }
  | { readonly command: "CATALOG_SEARCH"; readonly id: bigint; readonly catalog: string; readonly parameters: string; readonly trace?: TraceContext }
  | { readonly command: "STREAM_METADATA"; readonly id: bigint; readonly dataset: string; readonly quality: string; readonly trace?: TraceContext }
  | { readonly command: "CATALOG_KEYFIGURES"; readonly id: bigint; readonly catalog: string; readonly action: "search" | "instrument" | "schema"; readonly parameters: string; readonly contractFingerprint: string; readonly priceCutoffMs?: bigint; readonly priceAgeMode?: "elapsed" | "trading-time" | "last-completed-session"; readonly trace?: TraceContext }
  | { readonly command: "SERVICE_CALL"; readonly id: bigint; readonly serviceId: string; readonly serviceCommand: string; readonly contractFingerprint: string; readonly mutationId?: string; readonly inputJson: string; readonly deadlineUnixMillis: bigint; readonly trace?: TraceContext }
  | { readonly command: "AUTH"; readonly id: bigint; readonly token: string | Uint8Array }
  | { readonly command: "CANCEL"; readonly id: bigint; readonly targetId: bigint }
  | { readonly command: "SNAPSHOT" | "STREAM"; readonly id: bigint; readonly blockMask: bigint; readonly expression: string; readonly dataset?: string; readonly adjustment: "raw" | "split"; readonly trace?: TraceContext }
  | { readonly command: "TS_RAW" | "TS_RAW_STREAM"; readonly id: bigint; readonly blockMask: bigint; readonly from: bigint; readonly through: bigint; readonly maxRows: number; readonly expression: string; readonly quality?: string; readonly dataset?: string; readonly adjustment: "raw" | "split"; readonly trace?: TraceContext }
  | { readonly command: "TS_CANDLE"; readonly id: bigint; readonly blockMask: bigint; readonly from: bigint; readonly through: bigint; readonly cadenceMicros: bigint; readonly expression: string; readonly quality?: string; readonly dataset?: string; readonly adjustment: "raw" | "split"; readonly trace?: TraceContext }
  | { readonly command: "TS_CANDLE_STREAM"; readonly id: bigint; readonly blockMask: bigint; readonly from: bigint; readonly through: bigint; readonly cadenceMicros: bigint; readonly updateIntervalMillis: number; readonly expression: string; readonly quality?: string; readonly dataset?: string; readonly adjustment: "raw" | "split"; readonly trace?: TraceContext }
  | { readonly command: "CATALOG"; readonly id: bigint; readonly catalog: string; readonly identifiers: readonly string[]; readonly fields: readonly string[]; readonly trace?: TraceContext };

export interface TraceContext {
  readonly traceId: Uint8Array;
  readonly parentSpanId: Uint8Array;
}

export type ResponseStatus = "CONTINUE" | "DONE" | "ERROR";
export type ResponsePhase = "SNAPSHOT" | "UPDATE";

interface SbeMessage {
  readonly format: SbeFormat;
  readonly body: Uint8Array;
}

export interface StandardResponse {
  readonly kind: "response";
  readonly requestId: bigint;
  readonly status: ResponseStatus;
  readonly message: SbeMessage | null;
  readonly error: string;
}

export interface CancelResponse {
  readonly kind: "cancel";
  readonly requestId: bigint;
  readonly targetId: bigint;
  readonly cancelled: boolean;
}

export type Response = StandardResponse | CancelResponse;

export interface MarketDataGap {
  readonly fromEventTimeMicros: bigint | null;
  readonly throughEventTimeMicros: bigint | null;
}

export interface MarketDataMessage<N extends BlockName = BlockName> {
  readonly messageId: bigint;
  readonly fields: MarketDataFields<N>;
  fieldIterator(): IterableIterator<MarketDataField<N>>;
}

export interface MarketDataDatasetRecord {
  readonly dataset: string;
  readonly datasetRecordKey: string;
}

export interface MarketDataBatch<N extends BlockName = BlockName> {
  readonly requestId: bigint;
  readonly phase: ResponsePhase;
  readonly selector: MarketSelector;
  readonly datasetRecord: MarketDataDatasetRecord;
  readonly messages: readonly MarketDataMessage<N>[];
  readonly gaps: readonly MarketDataGap[];
}

export interface CatalogLifecycle {
  readonly listing: "LISTED" | "NOT_LISTED";
  readonly activity: "UNKNOWN" | "ACTIVE" | "INACTIVE" | null;
  readonly visible: boolean;
  readonly effectiveTimeMicros: bigint;
  readonly hideAtMicros: bigint | null;
  readonly hiddenAtUnixSeconds: bigint | null;
}

export interface CatalogWireField {
  readonly label: string;
  readonly subfield: string | null;
  readonly wireId: number;
  readonly fixedLength: number | null;
  readonly payload: Uint8Array;
}

export interface CatalogWireRecord {
  readonly requestId: bigint;
  readonly phase: ResponsePhase;
  readonly catalog: string;
  readonly identifier: string;
  readonly recordIdentifier: string;
  readonly exists: boolean;
  readonly lifecycle: CatalogLifecycle | null;
  readonly fields: readonly CatalogWireField[];
}

export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolError";
  }
}

export class RequestError extends Error {
  constructor(
    public readonly requestId: bigint,
    message: string,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

export const blockMask = (blocks: readonly BlockName[] | undefined): bigint => {
  if (!blocks?.length) return 0n;
  let mask = 0n;
  for (const block of blocks) {
    const binding = BLOCK_BINDINGS[block];
    // Masks carry template IDs only; combining schemas can select a different block with the same ID.
    mask |= 1n << BigInt((binding.canonicalFormat ?? binding.format).templateId);
  }
  return mask;
};

export const encodeRequest = (request: Request): Uint8Array<ArrayBuffer> => {
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

export const decodeResponse = (source: ArrayBuffer | ArrayBufferView): Response => {
  const bytes = asBytes(source);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const { templateId, blockLength } = verifyHeader(bytes, view, SESSION_SCHEMA_ID, SESSION_SCHEMA_VERSION);
  if (templateId === CANCEL_RESPONSE_TEMPLATE_ID) {
    if (blockLength !== 17 || bytes.byteLength !== HEADER_LENGTH + blockLength) {
      throw new ProtocolError("cancel response has an invalid length");
    }
    const cancelled = view.getUint8(HEADER_LENGTH + 16);
    if (cancelled !== 0 && cancelled !== 1) throw new ProtocolError(`invalid cancelled flag ${cancelled}`);
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
  if (error.next !== bytes.byteLength) throw new ProtocolError("response contains trailing bytes");
  const format: SbeFormat = {
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
  let errorText: string;
  try {
    errorText = decoder.decode(error.value);
  } catch (cause) {
    throw new ProtocolError(`response error is not UTF-8: ${String(cause)}`);
  }
  if (status !== "ERROR" && errorText) throw new ProtocolError("non-error response contains an error message");
  return {
    kind: "response",
    requestId: view.getBigUint64(HEADER_LENGTH, true),
    status,
    message,
    error: errorText,
  };
};

export const decodeBatch = (response: StandardResponse, selector: MarketSelector): MarketDataBatch => {
  if (response.status !== "CONTINUE" || response.message === null) {
    throw new ProtocolError("only continuing data responses can be decoded as batches");
  }
  const { format: outer, body } = response.message;
  if (
    outer.schemaId !== MARKET_SCHEMA_ID
    || outer.templateId !== MESSAGE_BATCH_TEMPLATE_ID
    || outer.version !== MESSAGE_BATCH_SCHEMA_VERSION
    || outer.blockLength !== 1
    || body.byteLength < outer.blockLength
  ) {
    throw new ProtocolError(`unsupported market-data batch ${outer.schemaId}/${outer.templateId} version ${outer.version}`);
  }
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const phase = decodePhase(view.getUint8(0));
  let offset = outer.blockLength;
  const messageGroup = takeGroupHeader(body, view, offset, 14);
  offset = messageGroup.next;
  if (offset + messageGroup.count * 14 > body.byteLength) throw new ProtocolError("market-data messages are truncated");
  const messageRows = Array.from({length: messageGroup.count}, (_, index) => {
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
  if (offset + fieldGroup.count * 25 > body.byteLength) throw new ProtocolError("market-data fields are truncated");
  const fieldRows = Array.from({length: fieldGroup.count}, (_, index) => {
    const row = offset + index * 25;
    const clear = view.getUint8(row + 16);
    if (clear !== 0 && clear !== 1) throw new ProtocolError(`invalid field clear flag ${clear}`);
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
  if (offset + gapGroup.count * 16 > body.byteLength) throw new ProtocolError("market-data gaps are truncated");
  const gaps = Array.from({length: gapGroup.count}, (_, index) => {
    const row = offset + index * 16;
    const from = view.getBigUint64(row, true);
    const through = view.getBigUint64(row + 8, true);
    return {
      fromEventTimeMicros: from === 0xffff_ffff_ffff_ffffn ? null : from,
      throughEventTimeMicros: through === 0xffff_ffff_ffff_ffffn ? null : through,
    };
  });
  offset += gapGroup.count * 16;
  const datasetRecordKey = takeVarData(body, view, offset);
  offset = datasetRecordKey.next;
  const dataset = takeVarData(body, view, offset);
  offset = dataset.next;
  const payload = takeVarData(body, view, offset);
  if (payload.next !== body.byteLength) throw new ProtocolError("market-data batch contains trailing bytes");
  if (messageRows.reduce((count, row) => count + row.fieldCount, 0) !== fieldRows.length) {
    throw new ProtocolError("market-data message field ranges do not cover the field table");
  }
  let nextField = 0;
  const messages = messageRows.map(row => {
    if (row.firstField !== nextField || row.firstField + row.fieldCount > fieldRows.length) {
      throw new ProtocolError("market-data message has an invalid field range");
    }
    nextField += row.fieldCount;
    const fields: Record<string, unknown> = {};
    const entries: {readonly name: string; readonly value: unknown}[] = [];
    for (const field of fieldRows.slice(row.firstField, row.firstField + row.fieldCount)) {
      const binding = Object.values(BLOCK_BINDINGS).find(candidate =>
        (candidate.format.schemaId === field.format.schemaId && candidate.format.templateId === field.format.templateId)
        || (candidate.canonicalFormat?.schemaId === field.format.schemaId && candidate.canonicalFormat.templateId === field.format.templateId)
      );
      if (!binding) throw new ProtocolError(`unknown export format ${field.format.schemaId}/${field.format.templateId}`);
      const canonical = binding.canonicalFormat?.schemaId === field.format.schemaId
        && binding.canonicalFormat.templateId === field.format.templateId;
      const expected = canonical ? binding.canonicalFormat! : binding.format;
      if (field.format.version !== expected.version || field.format.blockLength !== expected.blockLength) {
        throw new ProtocolError(`unsupported ${binding.name} version ${field.format.version} blockLength ${field.format.blockLength}`);
      }
      if (Object.hasOwn(fields, binding.property)) throw new ProtocolError(`message contains ${binding.name} more than once`);
      const end = field.payloadOffset + field.payloadLength;
      if (end > payload.value.byteLength || (!field.clear && field.payloadLength !== field.format.blockLength)) {
        throw new ProtocolError(`${binding.name} payload is outside the batch payload`);
      }
      if (field.clear && field.payloadLength !== 0) throw new ProtocolError(`${binding.name} clear carries a payload`);
      let body: Uint8Array = payload.value;
      let bodyOffset = field.payloadOffset;
      if (canonical && !field.clear) {
        body = new Uint8Array(binding.format.blockLength);
        new DataView(body.buffer).setBigUint64(0, field.eventTimeMicros, true);
        body.set(payload.value.subarray(field.payloadOffset, end), 8);
        bodyOffset = 0;
      }
      const value = field.clear ? null : binding.codec.decodeBody(body, bodyOffset);
      fields[binding.property] = value;
      entries.push(Object.freeze({name: binding.property, value}));
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
    } as MarketDataBatch;
  } catch (cause) {
    throw new ProtocolError(`batch text is not UTF-8: ${String(cause)}`);
  }
};

export const decodeKeyfiguresResult = (response: StandardResponse): unknown => {
  const message = response.message;
  if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID
      || message.format.templateId !== 103 || message.format.version !== 6 || message.format.blockLength !== 0) {
    throw new ProtocolError("unsupported Catalog keyfigures result");
  }
  const body = message.body;
  if (body.byteLength < 4 || new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true) !== body.byteLength - 4) {
    throw new ProtocolError("malformed Catalog keyfigures result length");
  }
  try { return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(body.subarray(4))); }
  catch { throw new ProtocolError("malformed Catalog keyfigures result JSON"); }
};

export const decodeServiceCallResult = (response: StandardResponse): unknown => {
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
  try { return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(body.subarray(4))); }
  catch { throw new ProtocolError("invalid service result JSON"); }
};

export const decodeCatalogSearchResult = (response: StandardResponse): unknown => {
  const message = response.message;
  if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID
      || message.format.templateId !== 105 || message.format.version !== 8 || message.format.blockLength !== 0) {
    throw new ProtocolError("unsupported Catalog search result");
  }
  const body = message.body;
  if (body.byteLength < 4 || new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true) !== body.byteLength - 4) {
    throw new ProtocolError("malformed Catalog search result length");
  }
  try { return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(body.subarray(4))); }
  catch { throw new ProtocolError("malformed Catalog search result JSON"); }
};
export const decodeCatalogLookupResult = (response: StandardResponse): unknown => {
  const message = response.message;
  if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID
      || message.format.templateId !== 106 || message.format.version !== 9 || message.format.blockLength !== 0) {
    throw new ProtocolError("unsupported Catalog lookup result");
  }
  const body = message.body;
  if (body.byteLength < 4 || new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true) !== body.byteLength - 4) {
    throw new ProtocolError("malformed Catalog lookup result length");
  }
  try { return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(body.subarray(4))); }
  catch { throw new ProtocolError("malformed Catalog lookup result JSON"); }
};

export const decodeCatalogRecord = (response: StandardResponse): CatalogWireRecord => {
  if (response.status !== "CONTINUE" || response.message === null) {
    throw new ProtocolError("only continuing responses can be decoded as Catalog records");
  }
  const { format, body } = response.message;
  if (
    format.schemaId !== MARKET_SCHEMA_ID
    || format.templateId !== CATALOG_RECORD_TEMPLATE_ID
    || format.version > MARKET_SCHEMA_VERSION
    || format.blockLength !== 30
    || body.byteLength < format.blockLength + 6
  ) {
    throw new ProtocolError(`unsupported Catalog record ${format.schemaId}/${format.templateId} version ${format.version}`);
  }
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const exists = decodeBoolean(view.getUint8(1), "exists");
  const lifecyclePresent = decodeBoolean(view.getUint8(2), "lifecyclePresent");
  const listingValue = view.getUint8(3);
  const activityValue = view.getUint8(4);
  const visible = decodeBoolean(view.getUint8(5), "visible");
  const nullU64 = 18_446_744_073_709_551_615n;
  const hideAt = view.getBigUint64(14, true);
  const hiddenAt = view.getBigUint64(22, true);
  let lifecycle: CatalogLifecycle | null = null;
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
  const fields: CatalogWireField[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (let index = 0; index < group.count; index += 1) {
    if (offset + 6 > body.byteLength) throw new ProtocolError("Catalog field block is truncated");
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
    } catch (cause) {
      throw new ProtocolError(`Catalog field text is not UTF-8: ${String(cause)}`);
    }
  }
  const catalog = takeVarData(body, view, offset);
  offset = catalog.next;
  const identifier = takeVarData(body, view, offset);
  offset = identifier.next;
  const recordIdentifier = takeVarData(body, view, offset);
  if (recordIdentifier.next !== body.byteLength) throw new ProtocolError("Catalog record contains trailing bytes");
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
  } catch (cause) {
    throw new ProtocolError(`Catalog record text is not UTF-8: ${String(cause)}`);
  }
};

export const decodeCatalogFields = <D extends readonly CatalogFieldDescriptor[]>(
  record: CatalogWireRecord,
  descriptors: D,
  requireEveryField = false,
): { readonly [P in D[number] as P["label"]]?: CatalogDescriptorValue<P> } => {
  const selected = new Map(descriptors.map((descriptor) => [descriptor.label, descriptor]));
  const decoded: Record<string, unknown> = Object.create(null);
  for (const field of record.fields) {
    const descriptor = selected.get(field.label);
    if (!descriptor) {
      if (requireEveryField) decoded[field.label] = field.payload;
      continue;
    }
    if (
      (descriptor.wireId !== undefined && field.wireId !== descriptor.wireId)
      || (descriptor.fixedLength !== undefined && field.fixedLength !== descriptor.fixedLength)
      || (field.fixedLength !== null && field.payload.byteLength !== field.fixedLength)
    ) {
      throw new ProtocolError(`Catalog field ${field.label} has incompatible wire metadata`);
    }
    if (descriptor.multiple) {
      if (!field.subfield) throw new ProtocolError(`Catalog field ${field.label} requires a subfield`);
      const values = (decoded[field.label] ??= Object.create(null)) as Record<string, unknown>;
      if (Object.hasOwn(values, field.subfield)) throw new ProtocolError("duplicate Catalog subfield");
      values[field.subfield] = descriptor.decode(field.payload);
    } else {
      if (field.subfield !== null || Object.hasOwn(decoded, field.label)) throw new ProtocolError(`Catalog field ${field.label} requires a multiple descriptor`);
      decoded[field.label] = descriptor.decode(field.payload);
    }
  }
  return decoded as { readonly [P in D[number] as P["label"]]?: CatalogDescriptorValue<P> };
};

const encodeMarketRequest = (request: Exclude<Request, { readonly command: "AUTH" | "CANCEL" }>): Uint8Array<ArrayBuffer> => {
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
    const bytes = message(
      MARKET_SCHEMA_ID,
      DATASET_ROUTING_SCHEMA_VERSION,
      MARKET_TEMPLATE[request.command],
      28,
      16 + expression.byteLength + quality.byteLength + adjustment.byteLength + dataset.byteLength,
    );
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
    const value = new TextEncoder().encode(request.parameters);
    if (value.byteLength > 8192) throw new ProtocolError("listing selector too large");
    const bytes = message(MARKET_SCHEMA_ID, 15, MARKET_TEMPLATE.LISTING_LATEST, 0, 4 + value.byteLength);
    new DataView(bytes.buffer).setUint32(HEADER_LENGTH, value.byteLength, true);
    bytes.set(value, HEADER_LENGTH + 4);
    return bytes;
  }
  if (request.command === "SERVICE_CALL") {
    const values = [request.serviceId, request.serviceCommand, request.contractFingerprint, request.mutationId ?? "", request.inputJson]
      .map(value => new TextEncoder().encode(value));
    if (!values[0]?.length || values[0].length > 256 || !values[1]?.length || values[1].length > 128
      || !/^[a-f0-9]{64}$/.test(request.contractFingerprint) || (values[3]?.length ?? 0) > 128
      || (values[4]?.length ?? 0) > 64 * 1024) throw new ProtocolError("invalid service request");
    const bytes = message(MARKET_SCHEMA_ID, 16, MARKET_TEMPLATE.SERVICE_CALL, 8,
      values.reduce((sum, value) => sum + 4 + value.byteLength, 0));
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
  if (request.command === "CATALOG_SEARCH" || request.command === "CATALOG_LOOKUP") {
    const values = [request.catalog, request.parameters].map(value => new TextEncoder().encode(value));
    const bytes = message(MARKET_SCHEMA_ID, request.command === "CATALOG_SEARCH" ? 8 : 9, MARKET_TEMPLATE[request.command], 0, values.reduce((sum, value) => sum + 4 + value.byteLength, 0));
    const view = new DataView(bytes.buffer);
    let offset = HEADER_LENGTH;
    for (const value of values) {
      view.setUint32(offset, value.byteLength, true);
      bytes.set(value, offset + 4);
      offset += 4 + value.byteLength;
    }
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
  const bytes = message(
    MARKET_SCHEMA_ID,
    DATASET_ROUTING_SCHEMA_VERSION,
    MARKET_TEMPLATE[request.command],
    request.command === "TS_CANDLE" ? 32 : 36,
    16 + expression.byteLength + quality.byteLength + adjustment.byteLength + dataset.byteLength,
  );
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

const encodeOpen = (
  requestId: bigint,
  application: Uint8Array<ArrayBuffer>,
  trace: TraceContext | undefined,
): Uint8Array<ArrayBuffer> => {
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

const encodeWithText = (
  schemaId: number,
  version: number,
  templateId: number,
  blockLength: number,
  text: string | Uint8Array,
  fixed: (view: DataView) => void,
): Uint8Array<ArrayBuffer> => {
  const value = typeof text === "string" ? new TextEncoder().encode(text) : text;
  const bytes = message(schemaId, version, templateId, blockLength, 4 + value.byteLength);
  const view = new DataView(bytes.buffer);
  fixed(view);
  const offset = HEADER_LENGTH + blockLength;
  view.setUint32(offset, value.byteLength, true);
  bytes.set(value, offset + 4);
  return bytes;
};

const message = (
  schemaId: number,
  version: number,
  templateId: number,
  blockLength: number,
  tailLength = 0,
): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(HEADER_LENGTH + blockLength + tailLength);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, blockLength, true);
  view.setUint16(2, templateId, true);
  view.setUint16(4, schemaId, true);
  view.setUint16(6, version, true);
  return bytes;
};

const asBytes = (source: ArrayBuffer | ArrayBufferView): Uint8Array => source instanceof ArrayBuffer
  ? new Uint8Array(source)
  : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);

const verifyHeader = (
  bytes: Uint8Array,
  view: DataView,
  expectedSchema: number,
  expectedVersion: number,
): { readonly templateId: number; readonly blockLength: number } => {
  if (bytes.byteLength < HEADER_LENGTH) throw new ProtocolError("response has no SBE header");
  const blockLength = view.getUint16(0, true);
  const templateId = view.getUint16(2, true);
  const schemaId = view.getUint16(4, true);
  const version = view.getUint16(6, true);
  if (schemaId !== expectedSchema || version !== expectedVersion) {
    throw new ProtocolError(`unsupported response schema ${schemaId} version ${version}`);
  }
  if (bytes.byteLength < HEADER_LENGTH + blockLength) throw new ProtocolError("response fixed block is truncated");
  return { templateId, blockLength };
};

const takeVarData = (
  bytes: Uint8Array,
  view: DataView,
  offset: number,
): { readonly value: Uint8Array; readonly next: number } => {
  if (offset + 4 > bytes.byteLength) throw new ProtocolError("variable-data length is truncated");
  const length = view.getUint32(offset, true);
  const start = offset + 4;
  const next = start + length;
  if (next > bytes.byteLength) throw new ProtocolError("variable-data value is truncated");
  return { value: bytes.subarray(start, next), next };
};

const putGroupHeader = (
  bytes: Uint8Array<ArrayBuffer>,
  view: DataView<ArrayBuffer>,
  offset: number,
  values: readonly Uint8Array[],
): number => {
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

const takeGroupHeader = (
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  expectedBlockLength: number,
): { readonly count: number; readonly next: number } => {
  if (offset + 6 > bytes.byteLength) throw new ProtocolError("group header is truncated");
  const blockLength = view.getUint16(offset, true);
  if (blockLength !== expectedBlockLength) {
    throw new ProtocolError(`group block length is ${blockLength}, expected ${expectedBlockLength}`);
  }
  return { count: view.getUint32(offset + 2, true), next: offset + 6 };
};

const decodeStatus = (value: number): ResponseStatus => {
  if (value === 1) return "CONTINUE";
  if (value === 2) return "DONE";
  if (value === 3) return "ERROR";
  throw new ProtocolError(`unknown response status ${value}`);
};

const decodePhase = (value: number): ResponsePhase => {
  if (value === 1) return "SNAPSHOT";
  if (value === 2) return "UPDATE";
  throw new ProtocolError(`unknown response phase ${value}`);
};

const decodeBoolean = (value: number, name: string): boolean => {
  if (value === 0) return false;
  if (value === 1) return true;
  throw new ProtocolError(`${name} flag is ${value}`);
};

export function decodeStreamMetadata(response: StandardResponse): StreamMetadata {
  if (!response.message) throw new ProtocolError("missing Stream metadata response");
  const { format, body } = response.message;
  if (format.schemaId !== MARKET_SCHEMA_ID || format.templateId !== 104 || format.version !== METADATA_SCHEMA_VERSION || format.blockLength !== 0 || body.byteLength < 4) {
    throw new ProtocolError("unsupported Stream metadata response");
  }
  const length = new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true);
  if (length !== body.byteLength - 4) throw new ProtocolError("invalid Stream metadata length");
  try { return decodeStreamMetadataJson(body.subarray(4)); }
  catch (error) { throw new ProtocolError(error instanceof Error ? error.message : "invalid Stream metadata"); }
}

export function decodeListingResponse(response: StandardResponse): ListingEvent {
  const message = response.message;
  if (response.status !== "CONTINUE" || !message || message.format.schemaId !== MARKET_SCHEMA_ID || message.format.templateId !== 107 || message.format.version !== 15 || message.format.blockLength !== 0) throw new ProtocolError("unsupported listing response");
  const body = message.body;
  if (body.byteLength < 4 || new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0, true) !== body.byteLength - 4) throw new ProtocolError("invalid listing response length");
  return decodeListingEvent(body.subarray(4));
}
