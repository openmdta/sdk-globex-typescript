import type { Grant } from "./mdtoken.js";
import { type ConnectOptions } from "./connection.js";
export type { Grant } from "./mdtoken.js";
/** Keep the main client secret on a trusted backend. */
export declare const connectMainClient: (options: Omit<ConnectOptions, "token"> & ({
    readonly clientId: string;
    readonly secret: string;
} | {
    readonly credential: () => {
        readonly clientId: string;
        readonly secret: string;
    } | Promise<{
        readonly clientId: string;
        readonly secret: string;
    }>;
})) => Promise<import("./connection.js").Connection>;
export interface SignMDTokenOptions {
    readonly clientId: string;
    readonly secret: string;
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
//# sourceMappingURL=server.d.ts.map