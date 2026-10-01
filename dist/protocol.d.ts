import { type ListingEvent } from "./generated/listing.js";
import type { StreamMetadata } from "./generated/activity.js";
import { type BlockName, type MarketDataField, type MarketDataFields } from "./generated/bindings.js";
import type { SbeFormat } from "./generated/export-blocks.js";
import type { CatalogFieldDescriptor, CatalogDescriptorSelection } from "./catalog.js";
import type { CatalogLookupParameters } from "./lookup.js";
import type { CatalogSearchParameters } from "./search.js";
import type { MarketSelector } from "./selector.js";
export declare const WINDOW_SUBPROTOCOL = "openmdta.sbe-session.v2";
export declare const RESPONSE_WINDOW_BYTES: number;
export declare const RESPONSE_WINDOW_COUNT = 16;
export declare const RESPONSE_COST_OVERHEAD = 128;
export type Request = {
    readonly command: "CATALOG_FEED";
    readonly id: bigint;
    readonly catalog: string;
    readonly fields: readonly string[];
    readonly cursor: string | null;
    readonly trace?: TraceContext;
} | {
    readonly command: "FEED_LIVE";
    readonly id: bigint;
    readonly selectedFields?: readonly BlockName[];
    readonly dataset: string;
    readonly quality: string;
    readonly trace?: TraceContext;
} | {
    readonly command: "FEED_RECOVERY";
    readonly id: bigint;
    readonly selectedFields?: readonly BlockName[];
    readonly afterMessageId: bigint;
    readonly throughMessageId: bigint;
    readonly dataset: string;
    readonly quality: string;
    readonly trace?: TraceContext;
} | {
    readonly command: "FEED_SNAPSHOT";
    readonly id: bigint;
    readonly selectedFields?: readonly BlockName[];
    readonly dataset: string;
    readonly quality: string;
    readonly trace?: TraceContext;
} | {
    readonly command: "TS_PAGE";
    readonly id: bigint;
    readonly selector: string;
    readonly dataset?: string;
    readonly quality?: string;
    readonly selectedFields?: readonly BlockName[];
    readonly resolutionMicros: bigint;
    readonly order: "asc" | "desc";
    readonly limit: number;
    readonly boundary?: bigint;
    readonly guard?: bigint;
    readonly cursor?: string;
    readonly adjustment: "raw" | "split";
    readonly trace?: TraceContext;
} | {
    readonly command: "LISTING_LATEST";
    readonly id: bigint;
    readonly dataset: string;
    readonly quality: "RT" | "DL" | "EOD";
    readonly key: string;
    readonly blocks: readonly number[];
    readonly trace?: TraceContext;
} | {
    readonly command: "CATALOG_LOOKUP";
    readonly id: bigint;
    readonly catalog: string;
    readonly parameters: CatalogLookupParameters;
    readonly trace?: TraceContext;
} | {
    readonly command: "CATALOG_SEARCH";
    readonly id: bigint;
    readonly catalog: string;
    readonly parameters: CatalogSearchParameters;
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
    readonly key: string;
    readonly after: bigint;
    readonly searchQuery?: {
        readonly expression?: string;
        readonly cursor?: string;
        readonly facets?: readonly string[];
        readonly text?: string;
        readonly filters?: Partial<Record<string, readonly string[]>>;
        readonly ranges?: readonly {
            readonly field: string;
            readonly gt?: number;
            readonly ge?: number;
            readonly lt?: number;
            readonly le?: number;
            readonly min?: number;
            readonly max?: number;
            readonly absolute_margin?: number;
            readonly relative_margin?: number;
        }[];
        readonly sorts?: readonly {
            readonly field: string;
            readonly descending?: boolean;
        }[];
        readonly offset?: number;
        readonly limit?: number;
        readonly budget?: number;
    };
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
    readonly inputSbe: Uint8Array;
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
    readonly selectedFields?: readonly BlockName[];
    readonly expression: string;
    readonly dataset?: string;
    readonly adjustment: "raw" | "split";
    readonly trace?: TraceContext;
} | {
    readonly command: "TS_RAW" | "TS_RAW_STREAM";
    readonly id: bigint;
    readonly selectedFields?: readonly BlockName[];
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
    readonly selectedFields?: readonly BlockName[];
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
    readonly selectedFields?: readonly BlockName[];
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
export interface FeedWireControl {
    readonly kind: "fence" | "gap" | "watermark";
    readonly afterMessageId: bigint;
    readonly throughMessageId: bigint;
    readonly dataset: string;
}
export declare const decodeFeedControl: (response: StandardResponse) => FeedWireControl;
export interface FeedWireSnapshotHeader {
    readonly throughMessageId: bigint;
    readonly gaps: readonly {
        readonly afterMessageId: bigint;
        readonly throughMessageId: bigint;
    }[];
    readonly dataset: string;
}
export declare const decodeFeedSnapshotHeader: (response: StandardResponse) => FeedWireSnapshotHeader;
export type CatalogFeedWireControl = {
    readonly kind: "snapshot_begin";
} | {
    readonly kind: "snapshot_complete";
    readonly cursor: string;
} | {
    readonly kind: "cursor";
    readonly cursor: string;
};
export declare const decodeCatalogFeedControl: (response: StandardResponse) => CatalogFeedWireControl;
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
export declare const encodeFieldSelection: (fields: readonly BlockName[]) => Uint8Array<ArrayBuffer>;
export declare const encodeRequest: (request: Request) => Uint8Array<ArrayBuffer>;
export declare const encodeWindow: (targetId: bigint) => Uint8Array<ArrayBuffer>;
export declare const encodeRelease: (targetId: bigint, consumedBytes: number) => Uint8Array<ArrayBuffer>;
/** Decode one bounded transport batch; all body slices share the original frame. */
export declare const splitResponseBatch: (response: StandardResponse) => readonly StandardResponse[];
export declare const decodeResponse: (source: ArrayBuffer | ArrayBufferView) => Response;
/** Field IDs a request has announced: each names its semantic field and payload layout. */
export type AnnouncedFields = Map<number, {
    readonly semantic: string;
    readonly layout: string;
}>;
/** Record a DatasetFields response in the request's table; false for any other response. */
export declare const absorbDatasetFields: (response: StandardResponse, fields: AnnouncedFields) => boolean;
export declare const decodeBatch: (response: StandardResponse, selector: MarketSelector, announced: ReadonlyMap<number, {
    readonly semantic: string;
    readonly layout: string;
}>) => MarketDataBatch;
export declare const decodeKeyfiguresResult: (response: StandardResponse) => Uint8Array;
export interface ServiceCallWireResult {
    readonly ok: boolean;
    readonly outcome: "not_applied" | "unknown";
    readonly serviceId: string;
    readonly command: string;
    readonly contractFingerprint: string;
    readonly mutationId?: string;
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly valueSbe: Uint8Array;
}
export declare const decodeServiceCallResult: (response: StandardResponse) => ServiceCallWireResult;
export interface TimeseriesPageWireResult {
    readonly from: bigint;
    readonly through: bigint;
    readonly nextCursor: string | null;
    readonly status: 0 | 1 | 2 | 3;
}
export declare const decodeTimeseriesPageResult: (response: StandardResponse) => TimeseriesPageWireResult;
export declare const decodeCatalogSearchResult: (response: StandardResponse) => Uint8Array;
export declare const decodeCatalogLookupResult: (response: StandardResponse) => Uint8Array;
export declare const decodeCatalogRecord: (response: StandardResponse) => CatalogWireRecord;
export declare const decodeCatalogFields: <D extends readonly CatalogFieldDescriptor[]>(record: CatalogWireRecord, descriptors: D, requireEveryField?: boolean) => Partial<CatalogDescriptorSelection<D>>;
export declare function decodeStreamMetadata(response: StandardResponse): StreamMetadata;
export declare function decodeListingResponse(response: StandardResponse): ListingEvent;
export {};
//# sourceMappingURL=protocol.d.ts.map