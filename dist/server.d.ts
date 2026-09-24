import type { Grant } from "./mdtoken.js";
export type { Grant } from "./mdtoken.js";
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