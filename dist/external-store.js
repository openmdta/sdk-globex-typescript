import { DATASETS, DATASET_CAPABILITIES } from "./generated/datasets.js";
import { selectorExpression } from "./selector.js";
export class MarketDataExternalStore {
    connection;
    #selections = new Map();
    #records = new Map();
    #catalog = new Map();
    #grace;
    #catalogExpiry;
    constructor(connection, options = {}) {
        this.connection = connection;
        this.#grace = options.unsubscribeGraceMillis ?? 5_000;
        this.#catalogExpiry = options.catalogExpiryMillis ?? 3_600_000;
    }
    get dataset() {
        const get = (alias) => Object.freeze({
            id: DATASETS[alias],
            read: (selector, options = {}) => this.#readDataset(alias, selector, options),
        });
        return Object.freeze({
            ...Object.fromEntries(Object.keys(DATASETS).filter(alias => DATASET_CAPABILITIES[alias].some(capability => capability === "catalog")).map(alias => [alias, get(alias)])),
        });
    }
    #readDataset(alias, selector, options) {
        const dataset = DATASETS[alias];
        const fieldKey = options.fields
            ?.map(field => `${field.label}:${field.wireId ?? ""}:${field.fixedLength ?? ""}:${field.multiple ?? false}`)
            .join(",") ?? "*";
        const key = `${dataset}\u0000${selectorExpression(selector)}\u0000${fieldKey}`;
        const cached = this.#catalog.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        const value = (async () => {
            const records = [];
            for await (const record of this.connection.dataset[alias].read(selector, options))
                records.push(record);
            return Object.freeze(records);
        })();
        this.#catalog.set(key, {
            expiresAt: Date.now() + this.#catalogExpiry,
            value: value,
        });
        void value.catch(() => {
            if (this.#catalog.get(key)?.value === value)
                this.#catalog.delete(key);
        });
        return value;
    }
    latestStream(selector, blocks) {
        const key = `${selectorExpression(selector)}\u0000${[...(blocks ?? [])].sort().join(",")}`;
        const existing = this.#selections.get(key);
        if (existing)
            return existing.reference;
        const entry = {
            selector,
            ...(blocks === undefined ? {} : { blocks }),
            listeners: new Set(),
            records: new Map(),
            reference: undefined,
            handle: undefined,
            generation: 0,
            closeTimer: undefined,
            snapshot: Object.freeze({ selector, records: Object.freeze([]), pending: true, error: null }),
        };
        entry.reference = Object.freeze({
            getSnapshot: () => entry.snapshot,
            subscribe: (listener) => {
                if (entry.closeTimer !== undefined) {
                    clearTimeout(entry.closeTimer);
                    entry.closeTimer = undefined;
                }
                entry.listeners.add(listener);
                if (!entry.handle)
                    this.#open(entry);
                return () => {
                    entry.listeners.delete(listener);
                    if (entry.listeners.size === 0 && entry.closeTimer === undefined) {
                        entry.closeTimer = setTimeout(() => {
                            entry.closeTimer = undefined;
                            if (entry.listeners.size !== 0)
                                return;
                            entry.generation += 1;
                            const handle = entry.handle;
                            entry.handle = undefined;
                            if (handle)
                                void handle.cancel();
                        }, this.#grace);
                    }
                };
            },
        });
        this.#selections.set(key, entry);
        return entry.reference;
    }
    #record(msg) {
        const identity = `${msg.datasetRecord.dataset}\u0000${msg.datasetRecord.datasetRecordKey}`;
        let entry = this.#records.get(identity);
        if (!entry) {
            entry = {
                identity,
                datasetRecord: msg.datasetRecord,
                listeners: new Set(),
                reference: undefined,
                snapshot: Object.freeze({
                    datasetRecord: msg.datasetRecord,
                    fields: Object.freeze({ ...msg.fields }),
                    lastMessageId: msg.messageId,
                }),
            };
            const created = entry;
            entry.reference = Object.freeze({
                identity,
                datasetRecord: entry.datasetRecord,
                getSnapshot: () => created.snapshot,
                subscribe: (listener) => {
                    created.listeners.add(listener);
                    return () => created.listeners.delete(listener);
                },
            });
            this.#records.set(identity, entry);
        }
        else {
            entry.snapshot = Object.freeze({
                datasetRecord: entry.datasetRecord,
                fields: Object.freeze({ ...entry.snapshot.fields, ...msg.fields }),
                lastMessageId: msg.messageId,
            });
        }
        for (const listener of entry.listeners)
            listener();
        return entry.reference;
    }
    #open(entry) {
        const generation = ++entry.generation;
        const reset = () => {
            entry.records.clear();
            entry.snapshot = Object.freeze({ selector: entry.selector, records: Object.freeze([]), pending: true, error: null });
            for (const listener of entry.listeners)
                listener();
        };
        if (entry.records.size || !entry.snapshot.pending)
            reset();
        const handle = this.connection.latestStream(entry.selector, entry.blocks === undefined ? {} : { blocks: entry.blocks });
        entry.handle = handle;
        const stopReplay = handle.onReplay(reset);
        void (async () => {
            try {
                for await (const msg of handle) {
                    if (entry.generation !== generation)
                        break;
                    const record = this.#record(msg);
                    if (!entry.records.has(record.identity)) {
                        entry.records.set(record.identity, record);
                        entry.snapshot = Object.freeze({
                            selector: entry.selector,
                            records: Object.freeze([...entry.records.values()]),
                            pending: false,
                            error: null,
                        });
                        for (const listener of entry.listeners)
                            listener();
                    }
                }
            }
            catch (error) {
                if (entry.generation !== generation)
                    return;
                entry.snapshot = Object.freeze({ ...entry.snapshot, pending: false, error });
                for (const listener of entry.listeners)
                    listener();
            }
            finally {
                stopReplay();
                if (entry.generation === generation) {
                    entry.handle = undefined;
                    if (entry.snapshot.pending) {
                        entry.snapshot = Object.freeze({ ...entry.snapshot, pending: false });
                        for (const listener of entry.listeners)
                            listener();
                    }
                }
            }
        })();
    }
}
export const createExternalStore = (connection, options) => new MarketDataExternalStore(connection, options);
//# sourceMappingURL=external-store.js.map