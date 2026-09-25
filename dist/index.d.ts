export { AuthenticationError, ConnectionClosedError, connect, type Connection, type ConnectOptions, type DatasetClient, type DatasetNamespace, type DatasetReadOptions, type MultiRequestHandle, type MultiSelectedClient, type SelectedClient, type DatasetRecord, type RequestHandle, type ResolvedMarketDataMessage, type LatestOptions, type LatestStreamOptions, type StreamMetadataParameters, type TraceContext, type TsCandleOptions, type TsCandleStreamOptions, type TsRawOptions, type TsRawStreamOptions, type TimeseriesPage, type TimeseriesPageCursor, type TimeseriesPageOptions, type TimeseriesPageOrder, } from "./connection.js";
export { ProtocolError, RequestError, WEBSOCKET_SUBPROTOCOL, type MarketDataBatch, type MarketDataGap, type MarketDataMessage, type MarketDataDatasetRecord, type CatalogLifecycle, } from "./protocol.js";
export { BLOCK_BINDINGS, BLOCK_NAMES, type BlockName, type BlockValue, type BlockPropertyName, type MarketDataField, type MarketDataFields, type SnapshotBlockName, type StreamBlockName, type TsCandleBlockName, type TsCandleStreamBlockName, type TsRawBlockName, type TsRawStreamBlockName, } from "./generated/bindings.js";
export * from "./generated/export-blocks.js";
export * from "./catalog.js";
export { selector, type MarketSelector } from "./selector.js";
export * from "./external-store.js";
export { createRestClient, tokenBytes, tokenBearer, type DataToken, type TokenSource, type Grant, type RestOptions, type LatestQuery, type TimeseriesQuery } from "./mdtoken.js";
export * from "./keyfigures.js";
export type { StreamMetadata, StreamActivityMetadata, ActivitySchedule, ActivityWindow, ActivityException, WeeklyActivity, Holiday, ResolvedHolidayCalendar } from "./generated/activity.js";
export * from "./search.js";
export * from "./lookup.js";
export * as CatalogModels from "./generated/catalog-models.js";
export { ServiceError, type ServiceCallOptions } from "./service.js";
export * from "./generated/services.js";
//# sourceMappingURL=index.d.ts.map