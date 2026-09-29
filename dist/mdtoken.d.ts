import type { BlockName } from "./generated/bindings.js";
/** Opaque signed token bytes, or their unpadded base64url HTTP representation. */
export type DataToken = Uint8Array | string;
export type TokenSource = DataToken | (() => DataToken | Promise<DataToken>);
export interface Grant {
    readonly package: string;
    readonly quality: "RT" | "DL" | "EOD" | "*";
}
export declare const tokenBytes: (token: DataToken) => Uint8Array;
export declare const tokenBearer: (token: DataToken) => string;
export interface RestOptions {
    readonly url: string;
    readonly token: TokenSource;
    readonly fetch?: typeof fetch;
}
export interface LatestQuery {
    readonly selector: string;
    readonly dataset?: string;
    readonly blocks?: readonly BlockName[];
    /** Adjust prices and quantities for confirmed splits; raw is the default. */
    readonly adjustment?: "raw" | "split";
}
export interface TimeseriesQuery extends LatestQuery {
    readonly quality?: "RT" | "DL" | "EOD";
    /** Candle width in microseconds; zero selects raw history. */
    readonly resolution?: bigint | string;
    readonly from: bigint | string;
    readonly through: bigint | string;
    readonly maxRows?: number;
}
/** Each request obtains a token; the provider may reuse one until its expiry. */
export declare const createRestClient: (options: RestOptions) => {
    /** Converts on the gateway to the latest version this generated SDK understands. */
    versionedRecords: (datasetAlias: string, selector: string, families?: readonly string[], allowLossy?: boolean) => Promise<readonly import("./versioned-reads.js").VersionedRecord[]>;
    latest: (selector: string, options?: Omit<LatestQuery, "selector">) => Promise<Response>;
    timeseries: (selector: string, from: bigint | string, through: bigint | string, options?: Omit<TimeseriesQuery, "selector" | "from" | "through">) => Promise<Response>;
};
//# sourceMappingURL=mdtoken.d.ts.map