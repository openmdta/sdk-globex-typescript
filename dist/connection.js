import { DATASETS, DATASET_CAPABILITIES } from "./generated/datasets.js";
import { decodeCatalogLookup } from "./lookup.js";
import { decodeCatalogSearch } from "./search.js";
import { KEYFIGURES_CONTRACTS, decodeKeyfigures } from "./keyfigures.js";
import { tokenBytes } from "./mdtoken.js";
import { ServiceError, assertServiceValue, hydrateServiceValue } from "./service.js";
import { createServiceNamespace } from "./generated/services.js";
import { selectorExpression } from "./selector.js";
import { BLOCK_BINDINGS, } from "./generated/bindings.js";
import {} from "./catalog.js";
import { ProtocolError, RequestError, WEBSOCKET_SUBPROTOCOL, blockMask, decodeBatch, decodeStreamMetadata, decodeListingResponse, decodeCatalogFields, decodeCatalogRecord, decodeKeyfiguresResult, decodeServiceCallResult, decodeTimeseriesPageResult, decodeCatalogSearchResult, decodeCatalogLookupResult, decodeResponse, encodeRequest, } from "./protocol.js";
export class ConnectionClosedError extends Error {
    constructor() {
        super("market-data connection was closed");
        this.name = "ConnectionClosedError";
    }
}
class MergedHandle {
    handles;
    ids;
    constructor(handles) {
        this.handles = handles;
        this.ids = Object.freeze(handles.map(handle => handle.id));
    }
    get closed() {
        return this.handles.every(handle => handle.closed);
    }
    async cancel() {
        const cancelled = await Promise.all(this.handles.map(handle => handle.cancel()));
        return cancelled.some(Boolean);
    }
    async *[Symbol.asyncIterator]() {
        const iterators = this.handles.map(handle => handle[Symbol.asyncIterator]());
        const pending = new Map();
        for (let index = 0; index < iterators.length; index++) {
            pending.set(index, iterators[index].next().then(result => ({ index, result })));
        }
        try {
            while (pending.size) {
                const { index, result } = await Promise.race(pending.values());
                if (result.done) {
                    pending.delete(index);
                }
                else {
                    pending.set(index, iterators[index].next().then(next => ({ index, result: next })));
                    yield result.value;
                }
            }
        }
        finally {
            await this.cancel();
        }
    }
}
export class RequestLaggedError extends Error {
    constructor() {
        super("request consumer lagged; the request was cancelled");
        this.name = "RequestLaggedError";
    }
}
const MAX_ACTIVE_REQUESTS = 131_072;
const MAX_BUFFERED_RESPONSES_PER_REQUEST = 32;
const MAX_BUFFERED_RESPONSE_BYTES_PER_REQUEST = 32 * 1024 * 1024;
const messagesWithSource = (batch) => batch.messages.map(message => Object.freeze({
    ...message,
    requestId: batch.requestId,
    phase: batch.phase,
    selector: batch.selector,
    datasetRecord: batch.datasetRecord,
}));
export class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = "AuthenticationError";
    }
}
export const connect = async (options) => {
    if (!options.url)
        throw new TypeError("WebSocket URL must not be empty");
    if (!options.token)
        throw new TypeError("authentication token must not be empty");
    const connection = new ReconnectingConnection(options);
    await connection.ready();
    return connection;
};
/** Internal listing transport for source diagnostics and load tests. Not exported by the SDK package. */
export const connectInternal = async (options) => {
    const connection = await connect(options);
    return connection;
};
class ReconnectingConnection {
    #url;
    #token;
    #WebSocket;
    #active = new Map();
    #cancellations = new Map();
    #initial;
    #resolveInitial;
    #rejectInitial;
    #nextId = 2n;
    #socket;
    #auth;
    #authenticated = false;
    #closing = false;
    #initialSettled = false;
    #lastHeartbeat = 0;
    #identity;
    #track(active) {
        if (this.#active.size >= MAX_ACTIVE_REQUESTS)
            throw new RangeError("connection active-request capacity reached");
        this.#active.set(active.handle.id, active);
    }
    constructor(options) {
        this.#url = options.url;
        this.#token = options.token;
        this.#WebSocket = options.webSocket ?? WebSocket;
        this.#initial = new Promise((resolve, reject) => {
            this.#resolveInitial = resolve;
            this.#rejectInitial = reject;
        });
        void this.#run();
    }
    ready() {
        return this.#initial;
    }
    get service() {
        return createServiceNamespace((binding, input, options) => this.#serviceCall(binding, input, options));
    }
    async #serviceCall(binding, input, options = {}) {
        if (this.#closing)
            throw new ConnectionClosedError();
        if (options.signal?.aborted)
            throw new ServiceError("aborted", binding.serviceId, binding.command, "not_applied", options.mutationId, undefined, "service call aborted");
        if (options.retry === "never" && !this.#authenticated)
            throw new ServiceError("connection_lost", binding.serviceId, binding.command, "not_applied", options.mutationId, undefined, "service connection is offline");
        const timeoutMs = options.timeoutMs ?? 30_000;
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000)
            throw new RangeError("service timeout must be 1–30000 milliseconds");
        const mutationId = binding.mutation ? (options.mutationId ?? crypto.randomUUID()) : undefined;
        if (options.mutationId !== undefined && !binding.mutation)
            throw new TypeError("read commands do not accept mutation IDs");
        if (mutationId !== undefined && (!mutationId || new TextEncoder().encode(mutationId).length > 128))
            throw new TypeError("invalid mutation ID");
        const jsonInput = JSON.parse(JSON.stringify(input, (_key, value) => typeof value === "bigint" ? value.toString() : value));
        assertServiceValue(jsonInput, binding.inputSchema, binding.definitions, "input");
        const inputJson = JSON.stringify(jsonInput);
        if (new TextEncoder().encode(inputJson).length > 64 * 1024)
            throw new RangeError("service input exceeds 64 KiB");
        const id = this.#nextId++;
        const handle = new Handle(id, () => this.#cancel(id));
        const deadlineUnixMillis = BigInt(Date.now() + timeoutMs);
        const active = {
            command: "SERVICE_CALL", handle, retry: options.retry ?? "transport",
            service: { id: binding.serviceId, command: binding.command, ...(mutationId === undefined ? {} : { mutationId }) },
            encoded: encodeRequest({ command: "SERVICE_CALL", id, serviceId: binding.serviceId, serviceCommand: binding.command,
                contractFingerprint: binding.fingerprint, ...(mutationId === undefined ? {} : { mutationId }), inputJson, deadlineUnixMillis }),
            decode: response => {
                const value = decodeServiceCallResult(response);
                if (typeof value !== "object" || value === null || Array.isArray(value))
                    throw new ProtocolError("invalid service result envelope");
                const result = value;
                if (result.ok !== true) {
                    const error = result.error;
                    if (typeof error !== "object" || error === null || Array.isArray(error))
                        throw new ProtocolError("invalid service error");
                    const fields = error;
                    if (typeof fields.code !== "string" || typeof fields.message !== "string" || !["not_applied", "unknown"].includes(String(fields.outcome)))
                        throw new ProtocolError("invalid service error fields");
                    const errorSchema = Object.hasOwn(binding.errorSchemas, fields.code) ? binding.errorSchemas[fields.code] : undefined;
                    if (errorSchema !== undefined)
                        assertServiceValue(fields.details, errorSchema, binding.definitions, "error details");
                    throw new ServiceError(fields.code, binding.serviceId, binding.command, active.interrupted ? "unknown" : fields.outcome, mutationId, errorSchema === undefined ? fields.details : hydrateServiceValue(fields.details, errorSchema, binding.definitions), fields.message);
                }
                assertServiceValue(result.result, binding.outputSchema, binding.definitions, "result");
                return hydrateServiceValue(result.result, binding.outputSchema, binding.definitions);
            },
        };
        this.#track(active);
        if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
            active.sent = true;
            this.#socket.send(active.encoded);
        }
        let timer;
        const abort = () => {
            this.#active.delete(id);
            handle.fail(new ServiceError("aborted", binding.serviceId, binding.command, active.sent ? "unknown" : "not_applied", mutationId, undefined, "service call aborted"));
        };
        try {
            timer = setTimeout(() => {
                this.#active.delete(id);
                handle.fail(new ServiceError("deadline_exceeded", binding.serviceId, binding.command, active.sent ? "unknown" : "not_applied", mutationId, undefined, "service deadline expired"));
            }, timeoutMs);
            options.signal?.addEventListener("abort", abort, { once: true });
            return await handle.await();
        }
        catch (error) {
            if (error instanceof ServiceError)
                throw error;
            throw new ServiceError(error instanceof AuthenticationError ? "unauthenticated" : "connection_lost", binding.serviceId, binding.command, active.sent ? "unknown" : "not_applied", mutationId, undefined, error instanceof Error ? error.message : "service call failed");
        }
        finally {
            if (timer !== undefined)
                clearTimeout(timer);
            options.signal?.removeEventListener("abort", abort);
            this.#active.delete(id);
        }
    }
    get dataset() {
        const get = (id, capabilities) => ({
            id,
            ...(capabilities.includes("catalog") ? {
                read: (selector, options = {}) => this.#startCatalog(id, [selectorExpression(selector)], options.fields ?? "*", options.trace, new Map([[selectorExpression(selector), selector]])),
                lookup: (query, options) => this.#catalogLookup(id, {
                    ...(typeof query === "string" ? { expression: query } : { dimensions: query }),
                    ...options,
                }),
            } : {}),
            ...(capabilities.includes("search") ? {
                search: parameters => this.#catalogSearch(id, parameters),
            } : {}),
            ...(capabilities.includes("latest") ? {
                latest: (selector, options) => this.latest(selector, { ...options, dataset: id }),
                latestBatched: (selector, options) => this.latestBatched(selector, { ...options, dataset: id }),
                latestStream: (selector, options) => this.latestStream(selector, { ...options, dataset: id }),
                latestStreamBatched: (selector, options) => this.latestStreamBatched(selector, { ...options, dataset: id }),
            } : {}),
            ...(capabilities.includes("timeseries") ? {
                timeseries: (selector, from, through, options) => this.tsRaw(selector, from, through, { ...options, dataset: id }),
                timeseriesBatched: (selector, from, through, options) => this.tsRawBatched(selector, from, through, { ...options, dataset: id }),
                timeseriesPage: (selector, order, boundary, limit, options) => this.tsRawPage(selector, order, boundary, limit, { ...options, dataset: id }),
                candlePage: (selector, cadenceMicros, order, boundary, limit, options) => this.tsCandlePage(selector, cadenceMicros, order, boundary, limit, { ...options, dataset: id }),
            } : {}),
        });
        return Object.freeze({
            ...Object.fromEntries(Object.entries(DATASETS).map(([alias, id]) => [alias, get(id, DATASET_CAPABILITIES[alias])])),
        });
    }
    select(selection) {
        const selected = (selector) => Object.freeze({
            read: (options = {}) => this.#startCatalog("", [selectorExpression(selector)], options.fields ?? "*", options.trace, new Map([[selectorExpression(selector), selector]])),
            latest: (options = {}) => this.latest(selector, options),
            latestBatched: (options = {}) => this.latestBatched(selector, options),
            latestStream: (options = {}) => this.latestStream(selector, options),
            latestStreamBatched: (options = {}) => this.latestStreamBatched(selector, options),
            timeseries: (from, through, options = {}) => this.tsRaw(selector, from, through, options),
            timeseriesBatched: (from, through, options = {}) => this.tsRawBatched(selector, from, through, options),
            timeseriesPage: (order, boundary, limit, options = {}) => this.tsRawPage(selector, order, boundary, limit, options),
            candlePage: (cadenceMicros, order, boundary, limit, options = {}) => this.tsCandlePage(selector, cadenceMicros, order, boundary, limit, options),
        });
        if (!Array.isArray(selection))
            return selected(selection);
        if (selection.length === 0)
            throw new TypeError("select requires at least one selector");
        const clients = selection.map(selected);
        return Object.freeze({
            read: (options = {}) => new MergedHandle(clients.map(client => client.read(options))),
            latest: (options = {}) => new MergedHandle(clients.map(client => client.latest(options))),
            latestBatched: (options = {}) => new MergedHandle(clients.map(client => client.latestBatched(options))),
            latestStream: (options = {}) => new MergedHandle(clients.map(client => client.latestStream(options))),
            latestStreamBatched: (options = {}) => new MergedHandle(clients.map(client => client.latestStreamBatched(options))),
        });
    }
    latest(selector, options = {}) {
        return this.#start("SNAPSHOT", { selector, ...options });
    }
    latestBatched(selector, options = {}) {
        return this.#start("SNAPSHOT", { selector, ...options }, undefined, true);
    }
    latestStream(selector, options = {}) {
        return this.#start("STREAM", { selector, ...options });
    }
    latestStreamBatched(selector, options = {}) {
        return this.#start("STREAM", { selector, ...options }, undefined, true);
    }
    tsRaw(selector, from, through, options = {}) {
        if (from > through)
            throw new RangeError("from must not exceed through");
        const maxMessages = options.maxMessages ?? 100;
        if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10_000) {
            throw new RangeError("maxMessages must be an integer from 1 through 10000");
        }
        this.#validateQuality(options.quality);
        return this.#start("TS_RAW", { selector, from, through, ...options }, { maxMessages });
    }
    tsRawBatched(selector, from, through, options = {}) {
        if (from > through)
            throw new RangeError("from must not exceed through");
        const maxMessages = options.maxMessages ?? 100;
        if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10_000) {
            throw new RangeError("maxMessages must be an integer from 1 through 10000");
        }
        this.#validateQuality(options.quality);
        return this.#start("TS_RAW", { selector, from, through, ...options }, { maxMessages }, true);
    }
    tsCandle(selector, from, through, cadenceMicros, options = {}) {
        if (from > through)
            throw new RangeError("from must not exceed through");
        if (cadenceMicros <= 0n)
            throw new RangeError("cadenceMicros must be positive");
        this.#validateQuality(options.quality);
        return this.#start("TS_CANDLE", { selector, from, through, cadenceMicros, ...options });
    }
    tsCandleBatched(selector, from, through, cadenceMicros, options = {}) {
        if (from > through)
            throw new RangeError("from must not exceed through");
        if (cadenceMicros <= 0n)
            throw new RangeError("cadenceMicros must be positive");
        if (options.quality !== undefined && !["RT", "DL", "EOD"].includes(options.quality.trim().toUpperCase())) {
            throw new RangeError("quality must be RT, DL, or EOD");
        }
        return this.#start("TS_CANDLE", { selector, from, through, cadenceMicros, ...options }, undefined, true);
    }
    tsRawPage(selector, order, boundary, limit, options = {}) {
        return this.#startPage(selector, 0n, "TS_RAW", order, boundary, limit, options);
    }
    tsCandlePage(selector, cadenceMicros, order, boundary, limit, options = {}) {
        if (cadenceMicros <= 0n)
            throw new RangeError("cadenceMicros must be positive");
        return this.#startPage(selector, cadenceMicros, "TS_CANDLE", order, boundary, limit, options);
    }
    #startPage(selector, cadenceMicros, command, order, boundary, limit, options) {
        if (this.#closing)
            throw new ConnectionClosedError();
        if (selector.subject === "list")
            throw new TypeError("list selectors are not supported for timeseries pages");
        if (order !== "asc" && order !== "desc")
            throw new TypeError("order must be asc or desc");
        if (!Number.isInteger(limit) || limit < 1 || limit > 200)
            throw new RangeError("page limit must be 1 through 200");
        this.#validateQuality(options.quality);
        if (order === "asc" && options.from !== undefined || order === "desc" && options.through !== undefined) {
            throw new TypeError("use through as the ascending guard or from as the descending guard");
        }
        for (const block of options.blocks ?? []) {
            if (!BLOCK_BINDINGS[block].commands.includes(command))
                throw new TypeError(`${block} is not available for ${command}`);
        }
        const guard = order === "desc" ? options.from : options.through;
        if (typeof boundary === "bigint" && boundary < 0n || guard !== undefined && guard < 0n) {
            throw new RangeError("timeseries boundaries must be non-negative");
        }
        if (typeof boundary === "string" && (!boundary || boundary.length > 2048)) {
            throw new TypeError("invalid timeseries page cursor");
        }
        const parameters = JSON.stringify({
            selector: selectorExpression(selector),
            ...(options.dataset === undefined ? {} : { dataset: options.dataset }),
            ...(options.quality === undefined ? {} : { quality: options.quality.trim().toUpperCase() }),
            blockMask: blockMask(options.blocks).toString(),
            resolutionMicros: cadenceMicros.toString(),
            order,
            limit,
            ...(typeof boundary === "bigint" ? { boundary: boundary.toString() } : { cursor: boundary }),
            ...(guard === undefined ? {} : { guard: guard.toString() }),
            adjustment: options.adjustment ?? "raw",
        });
        const id = this.#nextId;
        this.#nextId += 1n;
        const request = { command: "TS_PAGE", id, parameters, ...(options.trace ? { trace: options.trace } : {}) };
        const handle = new Handle(id, () => this.#cancel(id));
        const rows = [];
        const gaps = [];
        handle.onReplay(() => { rows.length = 0; gaps.length = 0; });
        if (options.signal?.aborted)
            void handle.cancel();
        else
            options.signal?.addEventListener("abort", () => void handle.cancel(), { once: true });
        const active = {
            command: "TS_PAGE",
            encoded: encodeRequest(request),
            handle: handle,
            many: true,
            decode: response => {
                if (response.message?.format.templateId === 108) {
                    const batch = decodeBatch(response, selector);
                    rows.push(...batch.messages);
                    gaps.push(...batch.gaps);
                    return [];
                }
                const result = decodeTimeseriesPageResult(response);
                if (typeof result.from !== "string" || typeof result.through !== "string"
                    || result.nextCursor !== null && typeof result.nextCursor !== "string"
                    || result.status !== 0 && result.status !== 1) {
                    throw new ProtocolError("invalid timeseries page result");
                }
                return [{
                        rows: [...rows],
                        from: BigInt(result.from),
                        through: BigInt(result.through),
                        nextCursor: result.nextCursor,
                        status: result.status,
                        gaps: [...gaps],
                    }];
            },
        };
        this.#track(active);
        if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
            this.#socket.send(active.encoded);
        }
        return handle;
    }
    tsRawStream(selector, from, through, options = {}) {
        if (from > through)
            throw new RangeError("from must not exceed through");
        const maxMessages = options.maxMessages ?? 100;
        if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10_000) {
            throw new RangeError("maxMessages must be an integer from 1 through 10000");
        }
        this.#validateQuality(options.quality, false);
        return this.#start("TS_RAW_STREAM", { selector, from, through, ...options }, { maxMessages });
    }
    tsRawStreamBatched(selector, from, through, options = {}) {
        if (from > through)
            throw new RangeError("from must not exceed through");
        const maxMessages = options.maxMessages ?? 100;
        if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10_000) {
            throw new RangeError("maxMessages must be an integer from 1 through 10000");
        }
        this.#validateQuality(options.quality, false);
        return this.#start("TS_RAW_STREAM", { selector, from, through, ...options }, { maxMessages }, true);
    }
    tsCandleStream(selector, from, through, cadenceMicros, options = {}) {
        if (from > through)
            throw new RangeError("from must not exceed through");
        if (cadenceMicros <= 0n)
            throw new RangeError("cadenceMicros must be positive");
        this.#validateQuality(options.quality, false);
        const updateIntervalMillis = options.updateIntervalMillis ?? 1_000;
        if (!Number.isInteger(updateIntervalMillis) || updateIntervalMillis < 0 || updateIntervalMillis > 0xffff_ffff) {
            throw new RangeError("updateIntervalMillis must be an unsigned 32-bit integer");
        }
        return this.#start("TS_CANDLE_STREAM", { selector, from, through, cadenceMicros, ...options }, { updateIntervalMillis });
    }
    tsCandleStreamBatched(selector, from, through, cadenceMicros, options = {}) {
        if (from > through)
            throw new RangeError("from must not exceed through");
        if (cadenceMicros <= 0n)
            throw new RangeError("cadenceMicros must be positive");
        this.#validateQuality(options.quality, false);
        const updateIntervalMillis = options.updateIntervalMillis ?? 1_000;
        if (!Number.isInteger(updateIntervalMillis) || updateIntervalMillis < 0 || updateIntervalMillis > 0xffff_ffff) {
            throw new RangeError("updateIntervalMillis must be an unsigned 32-bit integer");
        }
        return this.#start("TS_CANDLE_STREAM", { selector, from, through, cadenceMicros, ...options }, { updateIntervalMillis }, true);
    }
    #validateQuality(quality, allowEod = true) {
        if (quality === undefined)
            return;
        const normalized = quality.trim().toUpperCase();
        if (!["RT", "DL", "EOD"].includes(normalized) || (!allowEod && normalized === "EOD")) {
            throw new RangeError(allowEod ? "quality must be RT, DL, or EOD" : "streaming quality must be RT or DL");
        }
    }
    catalog_keyfigures(catalog) {
        if (!Object.hasOwn(KEYFIGURES_CONTRACTS, catalog))
            throw new TypeError(`unknown keyfigures catalog ${catalog}`);
        const start = (action, parameters, policy = {}) => {
            if (this.#closing)
                throw new ConnectionClosedError();
            if (policy.price_cutoff_ms !== undefined && (!Number.isSafeInteger(policy.price_cutoff_ms) || policy.price_cutoff_ms < 0))
                throw new RangeError("price_cutoff_ms must be a nonnegative safe integer");
            if (policy.price_age_mode !== undefined && !["elapsed", "trading-time", "last-completed-session"].includes(policy.price_age_mode))
                throw new RangeError("price_age_mode is invalid");
            if (new TextEncoder().encode(parameters).byteLength > 16_384)
                throw new RangeError("keyfigures request exceeds 16 KiB");
            const id = this.#nextId++;
            const handle = new Handle(id, () => this.#cancel(id));
            const active = {
                command: "CATALOG_KEYFIGURES", handle,
                encoded: encodeRequest({ command: "CATALOG_KEYFIGURES", id, catalog, action, parameters, contractFingerprint: KEYFIGURES_CONTRACTS[catalog].fingerprint,
                    ...(policy.price_cutoff_ms === undefined ? {} : { priceCutoffMs: BigInt(policy.price_cutoff_ms) }), ...(policy.price_age_mode === undefined ? {} : { priceAgeMode: policy.price_age_mode }), ...(policy.trace ? { trace: policy.trace } : {}) }),
                decode: response => decodeKeyfigures(catalog, action, decodeKeyfiguresResult(response)),
            };
            this.#track(active);
            if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN)
                this.#socket.send(active.encoded);
            return handle;
        };
        return {
            search: (parameters = {}) => {
                const { price_cutoff_ms, price_age_mode, trace, ...query } = parameters;
                const policy = { ...(price_cutoff_ms === undefined ? {} : { price_cutoff_ms }), ...(price_age_mode === undefined ? {} : { price_age_mode }), ...(trace ? { trace } : {}) };
                return start("search", JSON.stringify(query, (_key, value) => {
                    if (typeof value === "number" && !Number.isFinite(value))
                        throw new RangeError("keyfigures numbers must be finite");
                    return value;
                }), policy);
            },
            instrument: (key, policy) => {
                if (!key.trim())
                    throw new TypeError("Catalog record key required");
                return start("instrument", key, policy);
            },
            schema: () => start("schema", ""),
        };
    }
    async close() {
        if (this.#closing)
            return;
        this.#closing = true;
        this.#authenticated = false;
        this.#auth?.reject(new ConnectionClosedError());
        this.#auth = undefined;
        if (!this.#initialSettled) {
            this.#initialSettled = true;
            this.#rejectInitial(new ConnectionClosedError());
        }
        this.#socket?.close(1000, "client closed");
        this.#socket = undefined;
        const error = new ConnectionClosedError();
        for (const active of this.#active.values())
            active.handle.fail(error);
        this.#active.clear();
        for (const cancellation of this.#cancellations.values())
            cancellation.resolve(false);
        this.#cancellations.clear();
    }
    #catalogSearch(catalog, parameters = {}) {
        if (this.#closing)
            throw new ConnectionClosedError();
        const { trace, ...query } = parameters;
        const json = JSON.stringify(query, (_key, value) => {
            if (typeof value === "number" && !Number.isFinite(value))
                throw new RangeError("search numbers must be finite");
            return value;
        });
        if (!catalog.trim() || new TextEncoder().encode(catalog).length > 256 || new TextEncoder().encode(json).length > 16_384)
            throw new RangeError("invalid Catalog search request size");
        const id = this.#nextId++, handle = new Handle(id, () => this.#cancel(id));
        const active = { command: "CATALOG_SEARCH", handle: handle,
            encoded: encodeRequest({ command: "CATALOG_SEARCH", id, catalog, parameters: json, ...(trace ? { trace } : {}) }),
            decode: response => decodeCatalogSearch(decodeCatalogSearchResult(response)) };
        this.#track(active);
        if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN)
            this.#socket.send(active.encoded);
        return handle;
    }
    #catalogLookup(catalog, parameters) {
        if (this.#closing)
            throw new ConnectionClosedError();
        const { trace, ...query } = parameters;
        const json = JSON.stringify(query, (_key, value) => {
            if (typeof value === "number" && !Number.isFinite(value))
                throw new RangeError("search numbers must be finite");
            return value;
        });
        if (!catalog.trim() || new TextEncoder().encode(catalog).length > 256 || new TextEncoder().encode(json).length > 16_384)
            throw new RangeError("invalid Catalog search request size");
        const id = this.#nextId++, handle = new Handle(id, () => this.#cancel(id));
        const active = { command: "CATALOG_LOOKUP", handle: handle,
            encoded: encodeRequest({ command: "CATALOG_LOOKUP", id, catalog, parameters: json, ...(trace ? { trace } : {}) }),
            decode: response => decodeCatalogLookup(decodeCatalogLookupResult(response)) };
        this.#track(active);
        if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN)
            this.#socket.send(active.encoded);
        return handle;
    }
    listingLatest(parameters) {
        if (this.#closing)
            throw new ConnectionClosedError();
        const { trace, ...selector } = parameters;
        if (!selector.dataset || !selector.key || new TextEncoder().encode(selector.key).length > 1024 || !["RT", "DL", "EOD"].includes(selector.quality) || !selector.blocks.length || selector.blocks.length > 64 || !selector.blocks.every(id => Number.isInteger(id) && id >= 0 && id <= 65535))
            throw new TypeError("invalid listing selector");
        const id = this.#nextId++;
        const handle = new Handle(id, () => this.#cancel(id));
        const active = { command: "LISTING_LATEST", encoded: encodeRequest({ command: "LISTING_LATEST", id, parameters: JSON.stringify(selector), ...(trace ? { trace } : {}) }), handle: handle, decode: response => {
                const event = decodeListingResponse(response);
                if (event.source.dataset !== selector.dataset || event.source.quality !== selector.quality || event.source.key !== selector.key || event.source.blocks.length !== selector.blocks.length || event.source.blocks.some((id, index) => id !== selector.blocks[index]))
                    throw new ProtocolError("listing source does not match request");
                return event;
            } };
        this.#track(active);
        if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN)
            this.#socket.send(active.encoded);
        return handle;
    }
    streamMetadata(dataset, quality, options = {}) {
        if (this.#closing)
            throw new ConnectionClosedError();
        const { trace } = options;
        if (!dataset.trim() || new TextEncoder().encode(dataset).length > 256 || !["RT", "DL", "EOD"].includes(quality)) {
            throw new TypeError("Stream metadata requires dataset and RT/DL/EOD quality");
        }
        const id = this.#nextId++;
        const handle = new Handle(id, () => this.#cancel(id));
        const request = { command: "STREAM_METADATA", id, dataset, quality, ...(trace ? { trace } : {}) };
        const active = {
            command: "STREAM_METADATA", encoded: encodeRequest(request), handle: handle,
            decode: response => {
                const metadata = decodeStreamMetadata(response);
                if (metadata.dataset !== dataset || metadata.quality !== quality)
                    throw new ProtocolError("Stream metadata response does not match request");
                return metadata;
            },
        };
        this.#track(active);
        if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
            this.#socket.send(active.encoded);
        }
        return handle;
    }
    #start(command, parameters, normalized = undefined, batched = false) {
        if (this.#closing)
            throw new ConnectionClosedError();
        const expression = selectorExpression(parameters.selector);
        if (parameters.selector.subject === "list" && command !== "SNAPSHOT" && command !== "STREAM") {
            throw new TypeError("list selectors are not supported for single-record timeseries");
        }
        for (const block of parameters.blocks ?? []) {
            if (!BLOCK_BINDINGS[block].commands.includes(command)) {
                throw new TypeError(`${block} is not available for ${command}`);
            }
        }
        const id = this.#nextId;
        this.#nextId += 1n;
        let request;
        if (command === "SNAPSHOT" || command === "STREAM") {
            request = {
                command,
                id,
                blockMask: blockMask(parameters.blocks),
                expression,
                ...(parameters.dataset === undefined ? {} : { dataset: parameters.dataset }),
                adjustment: parameters.adjustment ?? "raw",
                ...(parameters.trace ? { trace: parameters.trace } : {}),
            };
        }
        else if (command === "TS_RAW" || command === "TS_RAW_STREAM") {
            const history = parameters;
            request = {
                command,
                id,
                blockMask: blockMask(history.blocks),
                from: history.from,
                through: history.through,
                maxRows: normalized?.maxMessages ?? 100,
                expression,
                ...(history.dataset === undefined ? {} : { dataset: history.dataset }),
                adjustment: history.adjustment ?? "raw",
                ...(history.quality === undefined ? {} : { quality: history.quality.trim().toUpperCase() }),
                ...(history.trace ? { trace: history.trace } : {}),
            };
        }
        else {
            const history = parameters;
            const candle = {
                id,
                blockMask: blockMask(history.blocks),
                from: history.from,
                through: history.through,
                cadenceMicros: history.cadenceMicros,
                expression,
                ...(history.dataset === undefined ? {} : { dataset: history.dataset }),
                adjustment: history.adjustment ?? "raw",
                ...(history.quality === undefined ? {} : { quality: history.quality.trim().toUpperCase() }),
                ...(history.trace ? { trace: history.trace } : {}),
            };
            request = command === "TS_CANDLE_STREAM"
                ? { command, ...candle, updateIntervalMillis: normalized?.updateIntervalMillis ?? 1_000 }
                : { command, ...candle };
        }
        const handle = new Handle(id, () => this.#cancel(id));
        if (parameters.signal?.aborted)
            void handle.cancel();
        else
            parameters.signal?.addEventListener("abort", () => void handle.cancel(), { once: true });
        const active = {
            command,
            encoded: encodeRequest(request),
            handle: handle,
            many: !batched,
            decode: (response) => {
                const batch = decodeBatch(response, parameters.selector);
                if (batched)
                    return batch;
                return command === "SNAPSHOT" || command === "STREAM" ? messagesWithSource(batch) : batch.messages;
            },
        };
        this.#track(active);
        if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
            this.#socket.send(active.encoded);
        }
        return handle;
    }
    #startCatalog(catalog, identifiers, selection, trace, selectors = new Map()) {
        if (this.#closing)
            throw new ConnectionClosedError();
        if (!identifiers.length || identifiers.length > 256 || identifiers.some((identifier) => !identifier.trim())) {
            throw new TypeError("Catalog requests require 1 through 256 non-empty identifiers");
        }
        if (selection !== "*" && selection.length > 64) {
            throw new TypeError("Catalog requests support at most 64 fields");
        }
        if (selection !== "*" && selection.some(field => field.label === "*")) {
            throw new TypeError("omit Dataset fields to request every field");
        }
        const wildcard = selection === "*";
        const descriptors = wildcard ? [] : selection;
        const id = this.#nextId;
        this.#nextId += 1n;
        const request = {
            command: "CATALOG",
            id,
            catalog,
            identifiers,
            fields: wildcard ? [] : descriptors.map((descriptor) => descriptor.label),
            ...(trace ? { trace } : {}),
        };
        const handle = new Handle(id, () => this.#cancel(id));
        const active = {
            command: "CATALOG",
            encoded: encodeRequest(request),
            handle: handle,
            decode: (response) => {
                const wire = decodeCatalogRecord(response);
                if (catalog && wire.catalog !== catalog)
                    throw new ProtocolError(`Dataset response targets ${wire.catalog}, expected ${catalog}`);
                const dataset = wire.catalog;
                return {
                    requestId: wire.requestId,
                    phase: wire.phase,
                    dataset,
                    selector: selectors.get(wire.identifier) ?? wire.identifier,
                    datasetRecordKey: wire.recordIdentifier,
                    exists: wire.exists,
                    lifecycle: wire.lifecycle,
                    rawFields: wire.fields,
                    fields: decodeCatalogFields(wire, descriptors, wildcard),
                };
            },
        };
        this.#track(active);
        if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
            this.#socket.send(active.encoded);
        }
        return handle;
    }
    #cancel(targetId) {
        const target = this.#active.get(targetId);
        if (!target)
            return Promise.resolve(false);
        const id = this.#nextId;
        this.#nextId += 1n;
        const encoded = encodeRequest({ command: "CANCEL", id, targetId });
        return new Promise((resolve) => {
            this.#cancellations.set(id, { targetId, encoded, resolve });
            if (this.#authenticated && this.#socket?.readyState === this.#WebSocket.OPEN) {
                this.#socket.send(encoded);
            }
        });
    }
    async #run() {
        let attempt = 0;
        while (!this.#closing) {
            try {
                await this.#openAndServe();
                attempt = 0;
            }
            catch (cause) {
                const error = cause instanceof Error ? cause : new Error(String(cause));
                if (!this.#initialSettled || error instanceof AuthenticationError) {
                    this.#closing = true;
                    this.#socket?.close();
                    if (!this.#initialSettled) {
                        this.#initialSettled = true;
                        this.#rejectInitial(error);
                    }
                    for (const active of this.#active.values())
                        active.handle.fail(error);
                    this.#active.clear();
                    return;
                }
            }
            if (this.#closing)
                return;
            const ceiling = Math.min(30_000, 250 * 2 ** Math.min(attempt, 16));
            attempt += 1;
            await new Promise((resolve) => setTimeout(resolve, Math.random() * ceiling));
        }
    }
    async #openAndServe() {
        const socket = new this.#WebSocket(this.#url, WEBSOCKET_SUBPROTOCOL);
        socket.binaryType = "arraybuffer";
        this.#socket = socket;
        this.#authenticated = false;
        const closed = new Promise((resolve) => {
            socket.addEventListener("close", () => resolve(), { once: true });
        });
        await new Promise((resolve, reject) => {
            socket.addEventListener("open", () => resolve(), { once: true });
            socket.addEventListener("error", () => reject(new Error("WebSocket connection failed")), {
                once: true,
            });
            socket.addEventListener("close", () => reject(new Error("WebSocket closed before opening")), {
                once: true,
            });
        });
        if (socket.protocol !== WEBSOCKET_SUBPROTOCOL) {
            socket.close(1002, "subprotocol required");
            throw new ProtocolError(`server did not negotiate ${WEBSOCKET_SUBPROTOCOL}`);
        }
        socket.addEventListener("message", (event) => {
            void this.#receive(socket, event.data).catch(() => socket.close(1002, "invalid SBE message"));
        });
        const authenticated = new Promise((resolve, reject) => {
            this.#auth = { resolve, reject };
        });
        try {
            const supplied = await Promise.race([
                Promise.resolve(typeof this.#token === "function" ? this.#token() : this.#token),
                closed.then(() => { throw new Error("WebSocket closed while obtaining a token"); }),
            ]);
            // Preserve legacy UTF-8 credentials; MDToken base64url has a fixed SBE header.
            const token = typeof supplied === "string" && !supplied.startsWith("AAABAAgAAA") ? supplied : tokenBytes(supplied);
            const identity = typeof token === "string" && token.startsWith("main:")
                ? `main:${token.split(":", 3)[1]}`
                : typeof token === "string" ? `opaque:${token}` : (() => {
                    if (token.length < 12)
                        throw new AuthenticationError("invalid MDToken identity");
                    const length = new DataView(token.buffer, token.byteOffset, token.byteLength).getUint32(8, true);
                    if (!length || length > 128 || 12 + length > token.length)
                        throw new AuthenticationError("invalid MDToken identity");
                    return `data:${new TextDecoder("utf-8", { fatal: true }).decode(token.subarray(12, 12 + length))}`;
                })();
            if (this.#identity !== undefined && this.#identity !== identity)
                throw new AuthenticationError("client identity changed during reconnect");
            this.#identity = identity;
            socket.send(encodeRequest({ command: "AUTH", id: 1n, token }));
        }
        catch (error) {
            socket.close(1008, "token provider failed");
            throw error;
        }
        await Promise.race([
            authenticated,
            closed.then(() => Promise.reject(new Error("WebSocket closed during authentication"))),
        ]);
        this.#authenticated = true;
        this.#lastHeartbeat = Date.now();
        const replay = this.#initialSettled;
        if (!this.#initialSettled) {
            this.#initialSettled = true;
            this.#resolveInitial();
        }
        for (const active of this.#active.values()) {
            if (replay)
                active.handle.replay();
            socket.send(active.encoded);
            active.sent = true;
        }
        for (const cancellation of this.#cancellations.values())
            socket.send(cancellation.encoded);
        const heartbeat = setInterval(() => {
            if (Date.now() - this.#lastHeartbeat >= 15_000) {
                socket.close(1002, "authentication heartbeat timed out");
            }
        }, 5_000);
        await closed;
        for (const [id, active] of this.#active) {
            if (active.command !== "SERVICE_CALL" || !active.sent)
                continue;
            active.interrupted = true;
            if (active.retry === "never") {
                active.handle.fail(new ServiceError("connection_lost", active.service.id, active.service.command, "unknown", active.service.mutationId, undefined, "service connection lost"));
                this.#active.delete(id);
            }
        }
        clearInterval(heartbeat);
        if (this.#socket === socket)
            this.#socket = undefined;
        this.#authenticated = false;
        this.#auth = undefined;
    }
    async #receive(socket, data) {
        if (socket !== this.#socket)
            return;
        let source;
        if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
            source = data;
        }
        else if (data instanceof Blob) {
            source = await data.arrayBuffer();
        }
        else {
            throw new ProtocolError("server sent a non-binary WebSocket message");
        }
        this.#dispatch(decodeResponse(source));
    }
    #dispatch(response) {
        if (response.kind === "response" && response.requestId === 1n) {
            if (response.status === "ERROR") {
                const error = new AuthenticationError(response.error || "authentication failed");
                this.#auth?.reject(error);
                this.#auth = undefined;
                return;
            }
            if (response.status !== "CONTINUE" || response.message !== null) {
                this.#auth?.reject(new ProtocolError("AUTH response is not a keepalive"));
                this.#auth = undefined;
                return;
            }
            this.#lastHeartbeat = Date.now();
            this.#auth?.resolve();
            this.#auth = undefined;
            return;
        }
        if (response.kind === "cancel") {
            const pending = this.#cancellations.get(response.requestId);
            if (!pending || pending.targetId !== response.targetId)
                return;
            this.#cancellations.delete(response.requestId);
            const cancelled = response.cancelled;
            if (cancelled) {
                const target = this.#active.get(response.targetId);
                if (target) {
                    target.handle.finish();
                    this.#active.delete(response.targetId);
                }
            }
            pending.resolve(cancelled);
            return;
        }
        const active = this.#active.get(response.requestId);
        if (!active)
            return;
        if (response.status === "ERROR") {
            active.handle.fail(new RequestError(response.requestId, response.error || "request failed"));
            this.#active.delete(response.requestId);
        }
        else if (response.status === "DONE") {
            active.handle.finish();
            this.#active.delete(response.requestId);
        }
        else {
            try {
                const value = active.decode(response);
                const wireBytes = (response.message?.body.byteLength ?? 0) + 64;
                const values = active.many ? value : [value];
                const bytesPerValue = Math.max(1, Math.ceil(wireBytes / Math.max(1, values.length)));
                if (!values.every(item => active.handle.push(item, bytesPerValue))) {
                    void this.#cancel(response.requestId);
                    active.handle.fail(new RequestLaggedError());
                    this.#active.delete(response.requestId);
                }
                else if (active.command === "SERVICE_CALL") {
                    active.handle.finish();
                    this.#active.delete(response.requestId);
                }
            }
            catch (error) {
                active.handle.fail(error);
                this.#active.delete(response.requestId);
            }
        }
    }
}
class Handle {
    #replayListeners = new Set();
    id;
    #cancelRequest;
    #values = [];
    #waiting = [];
    #terminal = false;
    #error;
    #cancelled;
    #head = 0;
    #bufferedBytes = 0;
    constructor(id, cancelRequest) {
        this.id = id;
        this.#cancelRequest = cancelRequest;
    }
    async await() {
        const iterator = this[Symbol.asyncIterator]();
        const first = await iterator.next();
        if (first.done)
            throw new ProtocolError("request completed without a result");
        const end = await iterator.next();
        if (!end.done) {
            await this.cancel();
            throw new ProtocolError("single-result request returned multiple results");
        }
        return first.value;
    }
    get closed() {
        return this.#terminal;
    }
    onReplay(listener) {
        this.#replayListeners.add(listener);
        return () => this.#replayListeners.delete(listener);
    }
    replay() {
        this.#values.length = 0;
        this.#head = 0;
        this.#bufferedBytes = 0;
        for (const listener of this.#replayListeners)
            listener();
    }
    [Symbol.asyncIterator]() {
        return {
            next: () => {
                const buffered = this.#values[this.#head];
                if (buffered !== undefined) {
                    this.#values[this.#head] = undefined;
                    this.#head += 1;
                    this.#bufferedBytes -= buffered.bytes;
                    return Promise.resolve({ value: buffered.value, done: false });
                }
                if (this.#error !== undefined)
                    return Promise.reject(this.#error);
                if (this.#terminal)
                    return Promise.resolve({ value: undefined, done: true });
                return new Promise((resolve, reject) => {
                    this.#waiting.push({ resolve, reject });
                });
            },
            return: async () => {
                await this.cancel();
                return { value: undefined, done: true };
            },
        };
    }
    cancel() {
        if (this.#terminal)
            return Promise.resolve(false);
        if (!this.#cancelled) {
            const cancellation = this.#cancelRequest().then((cancelled) => {
                if (!cancelled && this.#cancelled === cancellation)
                    this.#cancelled = undefined;
                return cancelled;
            });
            this.#cancelled = cancellation;
        }
        return this.#cancelled;
    }
    push(value, bytes) {
        if (this.#terminal)
            return false;
        const waiting = this.#waiting.shift();
        if (waiting) {
            waiting.resolve({ value, done: false });
            return true;
        }
        if (this.#values.length - this.#head >= MAX_BUFFERED_RESPONSES_PER_REQUEST
            || this.#bufferedBytes + bytes > MAX_BUFFERED_RESPONSE_BYTES_PER_REQUEST)
            return false;
        this.#values.push({ value, bytes });
        this.#bufferedBytes += bytes;
        return true;
    }
    finish() {
        if (this.#terminal)
            return;
        this.#terminal = true;
        for (const waiting of this.#waiting.splice(0)) {
            waiting.resolve({ value: undefined, done: true });
        }
    }
    fail(error) {
        if (this.#terminal)
            return;
        this.#terminal = true;
        this.#error = error;
        this.#values.length = 0;
        this.#head = 0;
        this.#bufferedBytes = 0;
        for (const waiting of this.#waiting.splice(0))
            waiting.reject(error);
    }
}
//# sourceMappingURL=connection.js.map