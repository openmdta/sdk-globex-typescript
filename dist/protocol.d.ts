import { type ListingEvent } from "./generated/listing.js";
import { type StreamMetadata } from "./generated/activity.js";
import { type BlockName, type MarketDataField, type MarketDataFields } from "./generated/bindings.js";
import type { SbeFormat } from "./generated/export-blocks.js";
import type { CatalogFieldDescriptor, CatalogDescriptorValue } from "./catalog.js";
import type { MarketSelector } from "./selector.js";
export declare const WEBSOCKET_SUBPROTOCOL = "openmdta.sbe-session.v1";
export type Request = {
    readonly command: "TS_PAGE";
    readonly id: bigint;
    readonly parameters: string;
    readonly trace?: TraceContext;
} | {
    readonly command: "LISTING_LATEST";
    readonly id: bigint;
    readonly parameters: string;
    readonly trace?: TraceContext;
} | {
    readonly command: "CATALOG_LOOKUP";
    readonly id: bigint;
    readonly catalog: string;
    readonly parameters: string;
    readonly trace?: TraceContext;
} | {
    readonly command: "CATALOG_SEARCH";
    readonly id: bigint;
    readonly catalog: string;
    readonly parameters: string;
    readonly trace?: TraceContext;
} | {
    readonly command: "STREAM_METADATA";
    readonly id: bigint;
    readonly dataset: string;
    readonly quality: string;
    readonly trace?: TraceContext;
} | {
    readonly command: "CATALOG_KEYFIGURES";
    readonly id: bigint;
    readonly catalog: string;
    readonly action: "search" | "instrument" | "schema";
    readonly parameters: string;
    readonly contractFingerprint: string;
    readonly priceCutoffMs?: bigint;
    readonly priceAgeMode?: "elapsed" | "trading-time" | "last-completed-session";
    readonly trace?: TraceContext;
} | {
    readonly command: "SERVICE_CALL";
    readonly id: bigint;
    readonly serviceId: string;
    readonly serviceCommand: string;
    readonly contractFingerprint: string;
    readonly mutationId?: string;
    readonly inputJson: string;
    readonly deadlineUnixMillis: bigint;
    readonly trace?: TraceContext;
} | {
    readonly command: "AUTH";
    readonly id: bigint;
    readonly token: string | Uint8Array;
} | {
    readonly command: "CANCEL";
    readonly id: bigint;
    readonly targetId: bigint;
} | {
    readonly command: "SNAPSHOT" | "STREAM";
    readonly id: bigint;
    readonly blockMask: bigint;
    readonly expression: string;
    readonly dataset?: string;
    readonly adjustment: "raw" | "split";
    readonly trace?: TraceContext;
} | {
    readonly command: "TS_RAW" | "TS_RAW_STREAM";
    readonly id: bigint;
    readonly blockMask: bigint;
    readonly from: bigint;
    readonly through: bigint;
    readonly maxRows: number;
    readonly expression: string;
    readonly quality?: string;
    readonly dataset?: string;
    readonly adjustment: "raw" | "split";
    readonly trace?: TraceContext;
} | {
    readonly command: "TS_CANDLE";
    readonly id: bigint;
    readonly blockMask: bigint;
    readonly from: bigint;
    readonly through: bigint;
    readonly cadenceMicros: bigint;
    readonly expression: string;
    readonly quality?: string;
    readonly dataset?: string;
    readonly adjustment: "raw" | "split";
    readonly trace?: TraceContext;
} | {
    readonly command: "TS_CANDLE_STREAM";
    readonly id: bigint;
    readonly blockMask: bigint;
    readonly from: bigint;
    readonly through: bigint;
    readonly cadenceMicros: bigint;
    readonly updateIntervalMillis: number;
    readonly expression: string;
    readonly quality?: string;
    readonly dataset?: string;
    readonly adjustment: "raw" | "split";
    readonly trace?: TraceContext;
} | {
    readonly command: "CATALOG";
    readonly id: bigint;
    readonly catalog: string;
    readonly identifiers: readonly string[];
    readonly fields: readonly string[];
    readonly trace?: TraceContext;
};
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
export declare class ProtocolError extends Error {
    constructor(message: string);
}
export declare class RequestError extends Error {
    readonly requestId: bigint;
    constructor(requestId: bigint, message: string);
}
export declare const blockMask: (blocks: readonly BlockName[] | undefined) => bigint;
export declare const encodeRequest: (request: Request) => Uint8Array<ArrayBuffer>;
export declare const decodeResponse: (source: ArrayBuffer | ArrayBufferView) => Response;
export declare const decodeBatch: (response: StandardResponse, selector: MarketSelector) => MarketDataBatch;
export declare const decodeKeyfiguresResult: (response: StandardResponse) => unknown;
export declare const decodeServiceCallResult: (response: StandardResponse) => unknown;
export declare const decodeTimeseriesPageResult: (response: StandardResponse) => unknown;
export declare const decodeCatalogSearchResult: (response: StandardResponse) => unknown;
export declare const decodeCatalogLookupResult: (response: StandardResponse) => unknown;
export declare const decodeCatalogRecord: (response: StandardResponse) => CatalogWireRecord;
export declare const decodeCatalogFields: <D extends readonly CatalogFieldDescriptor[]>(record: CatalogWireRecord, descriptors: D, requireEveryField?: boolean) => { readonly [P in D[number] as P["label"]]?: CatalogDescriptorValue<P>; };
export declare function decodeStreamMetadata(response: StandardResponse): StreamMetadata;
export declare function decodeListingResponse(response: StandardResponse): ListingEvent;
export {};
//# sourceMappingURL=protocol.d.ts.map