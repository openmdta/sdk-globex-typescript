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
    readonly quality?: "RT" | "DL" | "EOD";
    /** Request a licensed, unadjusted canonical source field alongside customer export blocks. */
    readonly source_field?: string;
    readonly block_mask?: bigint | string;
    /** Adjust prices and quantities for confirmed splits; raw is the default. */
    readonly adjustment?: "raw" | "split";
}
export interface TimeseriesQuery extends LatestQuery {
    /** Candle width in microseconds; zero selects raw history. */
    readonly resolution?: bigint | string;
    readonly from: bigint | string;
    readonly through: bigint | string;
    readonly max_rows?: number;
}
/** Each request obtains a token; the provider may reuse one until its expiry. */
export declare const createRestClient: (options: RestOptions) => {
    latest: (selector: string, options?: Omit<LatestQuery, "selector">) => Promise<Response>;
    timeseries: (selector: string, from: bigint | string, through: bigint | string, options?: Omit<TimeseriesQuery, "selector" | "from" | "through">) => Promise<Response>;
};
//# sourceMappingURL=mdtoken.d.ts.map