/** Server-only signing entry point. Never import it into a browser bundle. */
import { createHmac } from "node:crypto";
import { deflateSync } from "node:zlib";
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
  readonly rateLimit?: { readonly id: string; readonly bucketSize: number; readonly refillPerSecond: number };
}

const variable = (bytes: Uint8Array): Buffer => {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(bytes.length);
  return Buffer.concat([size, bytes]);
};

export const signMDToken = (options: SignMDTokenOptions): Uint8Array => {
  const issued = options.issuedAt ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issued) || issued < 0 || !Number.isSafeInteger(options.lifetimeSeconds)
    || options.lifetimeSeconds < 1 || options.lifetimeSeconds > 300 || !Number.isSafeInteger(issued + options.lifetimeSeconds)) {
    throw new Error("MDToken lifetime must be 1–300 seconds with an integer issuedAt timestamp");
  }
  const key = Buffer.from(options.secret, "base64url");
  if (key.length !== 32 || key.toString("base64url") !== options.secret) throw new Error("secret must encode 32 bytes as unpadded base64url");
  const origins = options.allowedOrigins ?? [];
  if (origins.length > 32 || origins.some(origin => {
    try { const parsed = new URL(origin); return origin.length > 256 || !["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin; }
    catch { return true; }
  })) throw new Error("allowedOrigins must contain at most 32 canonical HTTP(S) origins");
  const client = Buffer.from(options.clientId);
  const audience = Buffer.from(options.audience);
  if (!client.length || client.length > 128 || !audience.length || audience.length > 256 || options.grants.length > 256) {
    throw new Error("invalid MDToken identity, audience or grant count");
  }
  const fixed = Buffer.alloc(20);
  fixed.writeBigInt64LE(BigInt(issued));
  fixed.writeBigInt64LE(BigInt(issued + options.lifetimeSeconds), 8);
  fixed.writeUInt16LE(1, 16);
  fixed.writeUInt16LE(options.grants.length, 18);
  const rows: Uint8Array[] = [];
  const component = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,61}[A-Za-z0-9])?$/;
  for (const grant of options.grants) {
    const pieces = grant.package.split(":");
    if (grant.package !== "*" && (pieces.length !== 2 || !pieces[1] || /[*\p{Cc}]/u.test(grant.package)
      || !component.test(pieces[0]!))) {
      throw new Error("package must be NAMESPACE:PACKAGE or *");
    }
    const quality = { "*": 0, RT: 1, DL: 2, EOD: 3 }[grant.quality];
    if (quality === undefined) throw new Error("invalid quality");
    rows.push(Buffer.from([quality]), variable(Buffer.from(grant.package)));
  }
  const limit = options.rateLimit;
  const originRows = origins.length || limit ? [Buffer.from([0, 0, origins.length, 0]), ...origins.map(origin => variable(Buffer.from(origin)))] : [];
  if (limit && (!limit.id || Buffer.byteLength(limit.id) > 128 || /\p{Cc}/u.test(limit.id)
    || !Number.isFinite(limit.bucketSize) || !Number.isFinite(limit.refillPerSecond)
    || limit.bucketSize < 0 || limit.refillPerSecond < 0
    || limit.bucketSize > 1_000_000_000 || limit.refillPerSecond > 1_000_000_000
    || Math.abs(limit.bucketSize * 1_000_000 - Math.round(limit.bucketSize * 1_000_000)) > 0.0001
    || Math.abs(limit.refillPerSecond * 1_000_000 - Math.round(limit.refillPerSecond * 1_000_000)) > 0.0001)) {
    throw new Error("invalid rateLimit policy");
  }
  let limitBody: Buffer | undefined;
  if (limit) {
    const value = Buffer.alloc(16);
    value.writeBigUInt64LE(BigInt(Math.round(limit.bucketSize * 1_000_000)));
    value.writeBigUInt64LE(BigInt(Math.round(limit.refillPerSecond * 1_000_000)), 8);
    limitBody = Buffer.concat([variable(Buffer.from(limit.id)), value]);
  }
  const claims = Buffer.concat([Buffer.from([16, 0, 2, 0, 8, 0, limit ? 2 : (origins.length ? 1 : 0), 0]), fixed, ...rows, ...originRows, variable(audience), ...(limitBody ? [variable(limitBody)] : [])]);
  if (claims.length > 65536) throw new Error("MDToken claims exceed 64 KiB");
  const prefix = Buffer.concat([
    Buffer.from([0, 0, 1, 0, 8, 0, 0, 0]), variable(client), variable(deflateSync(claims, { level: 6 })),
    Buffer.from([32, 0, 0, 0]),
  ]);
  const mac = createHmac("sha256", key).update("OpenMDTA-MDToken-v1\0").update(prefix).digest();
  const token = Buffer.concat([prefix, mac]);
  if (token.length > 6144) throw new Error("MDToken exceeds transport limit");
  return token;
};
