export declare const SESSION_SCHEMA_ID = 5;
export declare const SESSION_TEMPLATES: {
    readonly AuthRequest: {
        readonly templateId: 1;
        readonly blockLength: 8;
        readonly sinceVersion: 0;
        readonly groups: {};
    };
    readonly OpenRequest: {
        readonly templateId: 2;
        readonly blockLength: 40;
        readonly sinceVersion: 0;
        readonly groups: {};
    };
    readonly CancelRequest: {
        readonly templateId: 3;
        readonly blockLength: 16;
        readonly sinceVersion: 0;
        readonly groups: {};
    };
    readonly CreditRequest: {
        readonly templateId: 4;
        readonly blockLength: 12;
        readonly sinceVersion: 0;
        readonly groups: {};
    };
    readonly ResponseWindow: {
        readonly templateId: 5;
        readonly blockLength: 20;
        readonly sinceVersion: 1;
        readonly groups: {};
    };
    readonly ReleaseResponses: {
        readonly templateId: 6;
        readonly blockLength: 16;
        readonly sinceVersion: 1;
        readonly groups: {};
    };
    readonly ResponseBatch: {
        readonly templateId: 103;
        readonly blockLength: 0;
        readonly sinceVersion: 1;
        readonly groups: {
            readonly messages: 8;
        };
    };
    readonly Response: {
        readonly templateId: 101;
        readonly blockLength: 17;
        readonly sinceVersion: 0;
        readonly groups: {};
    };
    readonly CancelResponse: {
        readonly templateId: 102;
        readonly blockLength: 17;
        readonly sinceVersion: 0;
        readonly groups: {};
    };
};
export declare const GATEWAY_SCHEMA_ID = 102;
export declare const GATEWAY_TEMPLATES: {
    readonly SnapshotRequest: {
        readonly templateId: 1;
        readonly blockLength: 0;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly StreamRequest: {
        readonly templateId: 2;
        readonly blockLength: 0;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly FeedLiveRequest: {
        readonly templateId: 15;
        readonly blockLength: 0;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly FeedRecoveryRequest: {
        readonly templateId: 16;
        readonly blockLength: 16;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly FeedSnapshotRequest: {
        readonly templateId: 17;
        readonly blockLength: 0;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly CatalogFeedRequest: {
        readonly templateId: 18;
        readonly blockLength: 0;
        readonly sinceVersion: 19;
        readonly groups: {
            readonly fields: 0;
        };
    };
    readonly CatalogFeedControl: {
        readonly templateId: 113;
        readonly blockLength: 1;
        readonly sinceVersion: 19;
        readonly groups: {};
    };
    readonly FeedSnapshotHeader: {
        readonly templateId: 112;
        readonly blockLength: 8;
        readonly sinceVersion: 18;
        readonly groups: {
            readonly gaps: 16;
        };
    };
    readonly FeedControl: {
        readonly templateId: 111;
        readonly blockLength: 17;
        readonly sinceVersion: 18;
        readonly groups: {};
    };
    readonly TsRawRequest: {
        readonly templateId: 3;
        readonly blockLength: 20;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly TsCandleRequest: {
        readonly templateId: 4;
        readonly blockLength: 24;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly CatalogRequest: {
        readonly templateId: 5;
        readonly blockLength: 0;
        readonly sinceVersion: 2;
        readonly groups: {
            readonly identifiers: 0;
            readonly fields: 0;
        };
    };
    readonly TsRawStreamRequest: {
        readonly templateId: 6;
        readonly blockLength: 20;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly TsCandleStreamRequest: {
        readonly templateId: 7;
        readonly blockLength: 28;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly CatalogKeyfiguresRequest: {
        readonly templateId: 8;
        readonly blockLength: 16;
        readonly sinceVersion: 28;
        readonly groups: {};
    };
    readonly CatalogKeyfiguresResult: {
        readonly templateId: 103;
        readonly blockLength: 0;
        readonly sinceVersion: 32;
        readonly groups: {};
    };
    readonly MarketDataMessageBatch: {
        readonly templateId: 108;
        readonly blockLength: 1;
        readonly sinceVersion: 33;
        readonly groups: {
            readonly messages: 14;
            readonly fields: 23;
            readonly gaps: 16;
        };
    };
    readonly DatasetFields: {
        readonly templateId: 114;
        readonly blockLength: 0;
        readonly sinceVersion: 33;
        readonly groups: {
            readonly fields: 2;
        };
    };
    readonly CatalogRecord: {
        readonly templateId: 102;
        readonly blockLength: 30;
        readonly sinceVersion: 2;
        readonly groups: {
            readonly fields: 6;
        };
    };
    readonly Gap: {
        readonly templateId: 20;
        readonly blockLength: 16;
        readonly sinceVersion: 0;
        readonly groups: {};
    };
    readonly StreamMetadataQuery: {
        readonly templateId: 9;
        readonly blockLength: 0;
        readonly sinceVersion: 13;
        readonly groups: {};
    };
    readonly StreamMetadataResponse: {
        readonly templateId: 104;
        readonly blockLength: 1;
        readonly sinceVersion: 24;
        readonly groups: {
            readonly weeklyWindows: 1;
            readonly exceptions: 1;
            readonly holidays: 1;
        };
    };
    readonly CatalogSearchQuery: {
        readonly templateId: 10;
        readonly blockLength: 0;
        readonly sinceVersion: 27;
        readonly groups: {};
    };
    readonly CatalogSearchResponse: {
        readonly templateId: 105;
        readonly blockLength: 0;
        readonly sinceVersion: 8;
        readonly groups: {};
    };
    readonly CatalogLookupQuery: {
        readonly templateId: 11;
        readonly blockLength: 10;
        readonly sinceVersion: 23;
        readonly groups: {
            readonly dimensions: 0;
        };
    };
    readonly CatalogLookupResponse: {
        readonly templateId: 106;
        readonly blockLength: 0;
        readonly sinceVersion: 9;
        readonly groups: {};
    };
    readonly ListingLatestRequest: {
        readonly templateId: 12;
        readonly blockLength: 0;
        readonly sinceVersion: 21;
        readonly groups: {
            readonly blocks: 2;
        };
    };
    readonly ListingLatestEvent: {
        readonly templateId: 107;
        readonly blockLength: 2;
        readonly sinceVersion: 21;
        readonly groups: {
            readonly sourceBlocks: 2;
            readonly blocks: 19;
        };
    };
    readonly ServiceCallRequest: {
        readonly templateId: 13;
        readonly blockLength: 8;
        readonly sinceVersion: 31;
        readonly groups: {};
    };
    readonly ServiceCallResult: {
        readonly templateId: 109;
        readonly blockLength: 2;
        readonly sinceVersion: 31;
        readonly groups: {};
    };
    readonly TimeseriesPageRequest: {
        readonly templateId: 14;
        readonly blockLength: 31;
        readonly sinceVersion: 30;
        readonly groups: {};
    };
    readonly FieldSelection: {
        readonly templateId: 27;
        readonly blockLength: 0;
        readonly sinceVersion: 30;
        readonly groups: {
            readonly fields: 0;
        };
    };
    readonly TimeseriesPageResult: {
        readonly templateId: 110;
        readonly blockLength: 17;
        readonly sinceVersion: 17;
        readonly groups: {};
    };
};
export declare const SESSION_SCHEMA_VERSION = 0;
export declare const WINDOW_SUBPROTOCOL = "openmdta.sbe-session.v2";
export declare const DEFAULT_RESPONSE_WINDOW = 16;
export declare const RESPONSE_COST_OVERHEAD = 128;
export declare const BATCH_MESSAGES = 64;
export declare const MAX_APPLICATION_BODY_BYTES = 16777216;
export declare const MAX_ACTIVE_REQUESTS = 131072;
export declare const CLIENT_RESPONSE_QUEUE_CAPACITY = 32;
export declare const CLIENT_RESPONSE_BYTE_CAPACITY = 33554432;
export declare const CONNECTION_BYTE_CAPACITY = 67108864;
//# sourceMappingURL=session.d.ts.map