export class MemoryCatalogFeedSink {
    onWrite;
    records = new Map();
    #staging;
    #state = null;
    constructor(onWrite) {
        this.onWrite = onWrite;
    }
    async resume() {
        return this.#state;
    }
    async write(batch) {
        if (batch.control?.kind === "reset")
            this.#staging = undefined;
        if (batch.control?.kind === "snapshotBegin")
            this.#staging = new Map();
        const target = this.#staging ?? this.records;
        for (const record of batch.records) {
            if (record.exists)
                target.set(record.recordKey, record);
            else
                target.delete(record.recordKey);
        }
        if (batch.control?.kind === "snapshotComplete") {
            if (!this.#staging)
                throw new Error("Catalog snapshot completed without a begin event");
            this.records.clear();
            for (const [key, record] of this.#staging)
                this.records.set(key, record);
            this.#staging = undefined;
            this.#state = batch.control.state;
        }
        else if (batch.control?.kind === "cursor") {
            if (this.#staging)
                throw new Error("Catalog cursor arrived during a snapshot");
            this.#state = batch.control.state;
        }
        this.onWrite?.(batch);
    }
}
//# sourceMappingURL=catalog-feed.js.map