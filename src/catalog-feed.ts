import type {CatalogLifecycle, CatalogWireField} from "./protocol.js";

/** Opaque Catalog incarnation and WAL position. Persist it only after its rows. */
export type CatalogFeedState = string;

export interface CatalogFeedRecord {
  readonly catalog: string;
  readonly recordKey: string;
  readonly phase: "SNAPSHOT" | "UPDATE";
  readonly exists: boolean;
  readonly lifecycle: CatalogLifecycle | null;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly rawFields: readonly CatalogWireField[];
}

export type CatalogFeedControl =
  | {readonly kind: "reset"}
  | {readonly kind: "snapshotBegin"}
  | {readonly kind: "snapshotComplete"; readonly state: CatalogFeedState}
  | {readonly kind: "cursor"; readonly state: CatalogFeedState};

export interface CatalogFeedWrite<RecordType extends CatalogFeedRecord = CatalogFeedRecord> {
  readonly records: readonly RecordType[];
  readonly control?: CatalogFeedControl;
}

/** A durable sink stages snapshot rows and swaps them on snapshotComplete. */
export interface CatalogFeedSink<RecordType extends CatalogFeedRecord = CatalogFeedRecord> {
  resume(): Promise<CatalogFeedState | null>;
  write(batch: CatalogFeedWrite<RecordType>): Promise<void>;
}

export class MemoryCatalogFeedSink<RecordType extends CatalogFeedRecord = CatalogFeedRecord> implements CatalogFeedSink<RecordType> {
  readonly records = new Map<string, RecordType>();
  #staging: Map<string, RecordType> | undefined;
  #state: CatalogFeedState | null = null;

  constructor(readonly onWrite?: (batch: CatalogFeedWrite<RecordType>) => void) {}

  async resume(): Promise<CatalogFeedState | null> {
    return this.#state;
  }

  async write(batch: CatalogFeedWrite<RecordType>): Promise<void> {
    if (batch.control?.kind === "reset") this.#staging = undefined;
    if (batch.control?.kind === "snapshotBegin") this.#staging = new Map();
    const target = this.#staging ?? this.records;
    for (const record of batch.records) {
      if (record.exists) target.set(record.recordKey, record);
      else target.delete(record.recordKey);
    }
    if (batch.control?.kind === "snapshotComplete") {
      if (!this.#staging) throw new Error("Catalog snapshot completed without a begin event");
      this.records.clear();
      for (const [key, record] of this.#staging) this.records.set(key, record);
      this.#staging = undefined;
      this.#state = batch.control.state;
    } else if (batch.control?.kind === "cursor") {
      if (this.#staging) throw new Error("Catalog cursor arrived during a snapshot");
      this.#state = batch.control.state;
    }
    this.onWrite?.(batch);
  }
}
