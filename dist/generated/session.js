// Generated from schemas/sbe-websocket.xml, schemas/gateway-protocol.xml and openmdta-sbe-websocket. Do not edit.
export const SESSION_SCHEMA_ID = 5;
export const SESSION_TEMPLATES = {
    AuthRequest: { templateId: 1, blockLength: 8, sinceVersion: 0, groups: {} },
    OpenRequest: { templateId: 2, blockLength: 40, sinceVersion: 0, groups: {} },
    CancelRequest: { templateId: 3, blockLength: 16, sinceVersion: 0, groups: {} },
    CreditRequest: { templateId: 4, blockLength: 12, sinceVersion: 0, groups: {} },
    ResponseWindow: { templateId: 5, blockLength: 20, sinceVersion: 1, groups: {} },
    ReleaseResponses: { templateId: 6, blockLength: 16, sinceVersion: 1, groups: {} },
    ResponseBatch: { templateId: 103, blockLength: 0, sinceVersion: 1, groups: { messages: 8 } },
    Response: { templateId: 101, blockLength: 17, sinceVersion: 0, groups: {} },
    CancelResponse: { templateId: 102, blockLength: 17, sinceVersion: 0, groups: {} },
};
export const GATEWAY_SCHEMA_ID = 102;
export const GATEWAY_TEMPLATES = {
    SnapshotRequest: { templateId: 1, blockLength: 0, sinceVersion: 30, groups: {} },
    StreamRequest: { templateId: 2, blockLength: 0, sinceVersion: 30, groups: {} },
    FeedLiveRequest: { templateId: 15, blockLength: 0, sinceVersion: 30, groups: {} },
    FeedRecoveryRequest: { templateId: 16, blockLength: 16, sinceVersion: 30, groups: {} },
    FeedSnapshotRequest: { templateId: 17, blockLength: 0, sinceVersion: 30, groups: {} },
    CatalogFeedRequest: { templateId: 18, blockLength: 0, sinceVersion: 19, groups: { fields: 0 } },
    CatalogFeedControl: { templateId: 113, blockLength: 1, sinceVersion: 19, groups: {} },
    FeedSnapshotHeader: { templateId: 112, blockLength: 8, sinceVersion: 18, groups: { gaps: 16 } },
    FeedControl: { templateId: 111, blockLength: 17, sinceVersion: 18, groups: {} },
    TsRawRequest: { templateId: 3, blockLength: 20, sinceVersion: 30, groups: {} },
    TsCandleRequest: { templateId: 4, blockLength: 24, sinceVersion: 30, groups: {} },
    CatalogRequest: { templateId: 5, blockLength: 0, sinceVersion: 2, groups: { identifiers: 0, fields: 0 } },
    TsRawStreamRequest: { templateId: 6, blockLength: 20, sinceVersion: 30, groups: {} },
    TsCandleStreamRequest: { templateId: 7, blockLength: 28, sinceVersion: 30, groups: {} },
    CatalogKeyfiguresRequest: { templateId: 8, blockLength: 16, sinceVersion: 28, groups: {} },
    CatalogKeyfiguresResult: { templateId: 103, blockLength: 0, sinceVersion: 32, groups: {} },
    MarketDataMessageBatch: { templateId: 108, blockLength: 1, sinceVersion: 33, groups: { messages: 14, fields: 23, gaps: 16 } },
    DatasetFields: { templateId: 114, blockLength: 0, sinceVersion: 33, groups: { fields: 2 } },
    CatalogRecord: { templateId: 102, blockLength: 30, sinceVersion: 2, groups: { fields: 6 } },
    Gap: { templateId: 20, blockLength: 16, sinceVersion: 0, groups: {} },
    StreamMetadataQuery: { templateId: 9, blockLength: 0, sinceVersion: 13, groups: {} },
    StreamMetadataResponse: { templateId: 104, blockLength: 1, sinceVersion: 24, groups: { weeklyWindows: 1, exceptions: 1, holidays: 1 } },
    CatalogSearchQuery: { templateId: 10, blockLength: 0, sinceVersion: 27, groups: {} },
    CatalogSearchResponse: { templateId: 105, blockLength: 0, sinceVersion: 8, groups: {} },
    CatalogLookupQuery: { templateId: 11, blockLength: 10, sinceVersion: 23, groups: { dimensions: 0 } },
    CatalogLookupResponse: { templateId: 106, blockLength: 0, sinceVersion: 9, groups: {} },
    ListingLatestRequest: { templateId: 12, blockLength: 0, sinceVersion: 21, groups: { blocks: 2 } },
    ListingLatestEvent: { templateId: 107, blockLength: 2, sinceVersion: 21, groups: { sourceBlocks: 2, blocks: 19 } },
    ServiceCallRequest: { templateId: 13, blockLength: 8, sinceVersion: 31, groups: {} },
    ServiceCallResult: { templateId: 109, blockLength: 2, sinceVersion: 31, groups: {} },
    TimeseriesPageRequest: { templateId: 14, blockLength: 31, sinceVersion: 30, groups: {} },
    FieldSelection: { templateId: 27, blockLength: 0, sinceVersion: 30, groups: { fields: 0 } },
    TimeseriesPageResult: { templateId: 110, blockLength: 17, sinceVersion: 17, groups: {} },
};
export const SESSION_SCHEMA_VERSION = 0;
export const WINDOW_SUBPROTOCOL = "openmdta.sbe-session.v2";
export const DEFAULT_RESPONSE_WINDOW = 16;
export const RESPONSE_COST_OVERHEAD = 128;
export const BATCH_MESSAGES = 64;
export const MAX_APPLICATION_BODY_BYTES = 16777216;
export const MAX_ACTIVE_REQUESTS = 131072;
export const CLIENT_RESPONSE_QUEUE_CAPACITY = 32;
export const CLIENT_RESPONSE_BYTE_CAPACITY = 33554432;
export const CONNECTION_BYTE_CAPACITY = 67108864;
//# sourceMappingURL=session.js.map