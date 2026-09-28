/** Semantic versions are distinct from the SBE acting version in a payload. */
export interface FieldContractId {
    readonly family: string;
    readonly version: number;
}
export interface RetainedFieldContract {
    readonly id: FieldContractId;
    readonly field: string;
    readonly sha256: string;
}
export interface FieldVersionRequest {
    readonly supported: readonly FieldContractId[];
    readonly delivery: {
        readonly kind: "get";
    };
    readonly allowLossy: boolean;
    readonly pins: Readonly<Record<string, string>>;
}
/** Numeric values use exact decimal strings, including all 64-bit integers. */
export type VersionedValue = null | boolean | string | readonly VersionedValue[] | {
    readonly [key: string]: VersionedValue;
};
export interface VersionedField {
    readonly contract: FieldContractId;
    readonly field: string;
    readonly subfield?: string | null;
    readonly value: VersionedValue;
    readonly payloadBase64: string;
    readonly conversion: {
        readonly targetSha256: string;
        readonly planSha256?: string;
        readonly lossy: boolean;
    };
}
export interface VersionedRecord {
    readonly exists: boolean;
    readonly dataset?: string;
    readonly datasetRecordKey?: string;
    readonly versionedFields: readonly VersionedField[];
}
export declare function versionRequests(contracts: readonly RetainedFieldContract[], families?: readonly string[], allowLossy?: boolean): FieldVersionRequest[];
export declare function validateVersionedRecords(value: unknown, contracts: readonly RetainedFieldContract[], requests: readonly FieldVersionRequest[]): readonly VersionedRecord[];
//# sourceMappingURL=versioned-reads.d.ts.map