import type { Grant } from "./mdtoken.js";
import { type ConnectOptions } from "./connection.js";
export type { Grant } from "./mdtoken.js";
export interface SignMDTokenOptions {
    readonly clientId: string;
    /** The DataClient's Ed25519 private key: its 32-byte seed as unpadded base64url (a JWK's `d`). */
    readonly privateKey: string;
    readonly audience: string;
    readonly grants: readonly Grant[];
    readonly lifetimeSeconds: number;
    readonly issuedAt?: number;
    readonly allowedOrigins?: readonly string[];
    readonly rateLimit?: {
        readonly id: string;
        readonly bucketSize: number;
        readonly refillPerSecond: number;
    };
}
export declare const signMDToken: (options: SignMDTokenOptions) => Uint8Array;
/** Connect a trusted backend with its own DataClient key; every (re)connect signs a fresh token. */
export declare const connectServerClient: (options: Omit<ConnectOptions, "token"> & {
    readonly clientId: string;
    readonly privateKey: string;
    readonly audience: string;
    readonly grants?: readonly Grant[];
}) => Promise<import("./connection.js").Connection>;
//# sourceMappingURL=server.d.ts.map