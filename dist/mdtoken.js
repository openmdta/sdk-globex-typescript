export const tokenBytes = (token) => {
    if (token instanceof Uint8Array) {
        if (!token.length || token.length > 6144)
            throw new Error("invalid MDToken size");
        return token;
    }
    if (!token.length || token.length > 8192 || !/^[A-Za-z0-9_-]+$/.test(token))
        throw new Error("invalid MDToken base64url");
    const text = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(text, (character) => character.charCodeAt(0));
    if (tokenBearer(bytes) !== token)
        throw new Error("noncanonical MDToken base64url");
    return bytes;
};
export const tokenBearer = (token) => {
    if (typeof token === "string") {
        tokenBytes(token);
        return token;
    }
    if (!token.length || token.length > 6144)
        throw new Error("invalid MDToken size");
    return btoa(String.fromCharCode(...token)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
/** Each request obtains a token; the provider may reuse one until its expiry. */
export const createRestClient = (options) => {
    const request = async (path, query) => {
        const url = new URL(path, options.url);
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined)
                url.searchParams.set(key, String(value));
        }
        const token = typeof options.token === "function" ? await options.token() : options.token;
        return (options.fetch ?? fetch)(url, {
            headers: { Authorization: `Bearer ${tokenBearer(token)}` },
            credentials: "omit",
            redirect: "error",
        });
    };
    return {
        latest: (selector, options = {}) => request("/api/v1/snapshot", { selector, ...options }),
        timeseries: (selector, from, through, options = {}) => request("/api/v1/timeseries", { selector, from, through, ...options }),
    };
};
//# sourceMappingURL=mdtoken.js.map