/** Opaque signed token bytes, or their unpadded base64url HTTP representation. */
export type DataToken = Uint8Array | string;
export type TokenSource = DataToken | (() => DataToken | Promise<DataToken>);
export interface Grant {
  readonly package: string;
  readonly quality: "RT" | "DL" | "EOD" | "*";
}

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
export const createRestClient = (options: RestOptions) => {
  const request = async (path: string, query: LatestQuery | TimeseriesQuery): Promise<Response> => {
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
    latest: (selector: string, options: Omit<LatestQuery, "selector"> = {}) =>
      request("/api/v1/snapshot", {selector, ...options}),
    timeseries: (selector: string, from: bigint | string, through: bigint | string, options: Omit<TimeseriesQuery, "selector" | "from" | "through"> = {}) =>
      request("/api/v1/timeseries", {selector, from, through, ...options}),
  };
};
