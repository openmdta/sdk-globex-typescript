import {VERSION_CONTRACTS} from "./generated/version-contracts.js";
import {versionRequests,validateVersionedRecords} from "./versioned-reads.js";
import type {BlockName} from "./generated/bindings.js";
/** Opaque signed token bytes, or their unpadded base64url HTTP representation. */
export type DataToken = Uint8Array | string;
export type TokenSource = DataToken | (() => DataToken | Promise<DataToken>);
/** `*`, `NAMESPACE:LICENSE` (untimed) or `NAMESPACE:LICENSE:RT|DL|EOD`. */
export type Grant = string;

export const tokenBytes = (token: DataToken): Uint8Array => {
  if (token instanceof Uint8Array) {
    if (!token.length || token.length > 6144) throw new Error("invalid MDToken size");
    return token;
  }
  if (!token.length || token.length > 8192 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error("invalid MDToken base64url");
  const text = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(text, (character) => character.charCodeAt(0));
  if (tokenBearer(bytes) !== token) throw new Error("noncanonical MDToken base64url");
  return bytes;
};

export const tokenBearer = (token: DataToken): string => {
  if (typeof token === "string") {
    tokenBytes(token);
    return token;
  }
  if (!token.length || token.length > 6144) throw new Error("invalid MDToken size");
  return btoa(String.fromCharCode(...token)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

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
export const createRestClient = (options: RestOptions) => {
  const request = async (path: string, query: object): Promise<Response> => {
    const url = new URL(path, options.url);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const token = typeof options.token === "function" ? await options.token() : options.token;
    return (options.fetch ?? fetch)(url, {
      headers: { Authorization: `Bearer ${tokenBearer(token)}` },
      credentials: "omit",
      redirect: "error",
    });
  };
  return {
    /** Converts on the gateway to the latest version this generated SDK understands. */
    versionedRecords: async (datasetAlias:string,selector:string,families?:readonly string[],allowLossy=false) => {
      const versions=versionRequests(VERSION_CONTRACTS,families,allowLossy);
      const response=await request(`/api/v1/datasets/${encodeURIComponent(datasetAlias)}/records`,{selector,versions:JSON.stringify(versions)});
      if(!response.ok)throw new Error(`Versioned read failed: ${response.status}`);
      return validateVersionedRecords(await response.json(),VERSION_CONTRACTS,versions);
    },
    latest: (selector: string, options: Omit<LatestQuery, "selector"> = {}) =>
      request("/api/v1/market-data/latest", {selector, dataset:options.dataset, blocks:options.blocks?.join(","), adjustment:options.adjustment}),
    timeseries: (selector: string, from: bigint | string, through: bigint | string, options: Omit<TimeseriesQuery, "selector" | "from" | "through"> = {}) => {
      const cadence = options.resolution === undefined ? 0n : BigInt(options.resolution);
      if (cadence < 0n) throw new Error("resolution must be nonnegative");
      return request(`/api/v1/market-data/timeseries/${cadence === 0n ? "raw" : "candles"}`, {
        selector, from, through, dataset:options.dataset, quality:options.quality,
        blocks:options.blocks?.join(","), adjustment:options.adjustment,
        maxRows:options.maxRows, cadenceMicros:cadence === 0n ? undefined : cadence,
      });
    },
  };
};
