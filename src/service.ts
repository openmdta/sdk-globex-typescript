/** Shared transport options for generated application service commands. */
export interface ServiceCallOptions {
  readonly timeoutMs?: number;
  readonly retry?: "transport" | "never";
  readonly signal?: AbortSignal;
  /** Reuse a persisted operation ID when recovering a backend job. */
  readonly mutationId?: string;
}

export type MutationOutcome = "not_applied" | "unknown";

export class ServiceError extends Error {
  readonly name = "ServiceError";
  constructor(
    readonly code: string,
    readonly serviceId: string,
    readonly command: string,
    readonly outcome: MutationOutcome,
    readonly mutationId: string | undefined,
    readonly details: unknown,
    message: string,
  ) { super(message); }
}

export interface ServiceCommandBinding {
  readonly serviceId: string;
  readonly command: string;
  readonly fingerprint: string;
  readonly mutation: boolean;
  readonly inputSchema: unknown;
  readonly outputSchema: unknown;
  readonly definitions: Record<string, unknown>;
  readonly errorSchemas: Record<string, unknown>;
}

export type ServiceInvoker = (binding: ServiceCommandBinding, input: Record<string, unknown>, options?: ServiceCallOptions) => Promise<unknown>;

/** Intentionally small JSON Schema subset. Unsupported keywords fail generation. */
export const assertServiceValue = (value: unknown, schema: unknown, definitions: Record<string, unknown>, path = "value"): void => {
  if (typeof schema !== "object" || schema === null) throw new TypeError(`invalid schema for ${path}`);
  const shape = schema as Record<string, unknown>;
  if (typeof shape.$ref === "string") {
    const name = shape.$ref.startsWith("#/$defs/") ? shape.$ref.slice(8) : "";
    if (!name || !Object.hasOwn(definitions, name)) throw new TypeError(`unknown schema reference for ${path}`);
    assertServiceValue(value, definitions[name], definitions, path);
    return;
  }
  const variants = shape.anyOf ?? shape.oneOf;
  if (Array.isArray(variants)) {
    if (!variants.some(variant => {
      try { assertServiceValue(value, variant, definitions, path); return true; }
      catch { return false; }
    })) throw new TypeError(`invalid ${path}`);
    return;
  }
  if (Array.isArray(shape.type)) {
    assertServiceValue(value, {...shape, anyOf: shape.type.map(type => ({...shape, type}))}, definitions, path);
    return;
  }
  if (Array.isArray(shape.enum)) {
    if (!shape.enum.some(item => item === value)) throw new TypeError(`invalid ${path}`);
    return;
  }
  switch (shape.type) {
    case "null": if (value !== null) throw new TypeError(`invalid ${path}`); return;
    case "string":
      if (typeof value !== "string" || (shape.format === "uint64" && !/^(0|[1-9][0-9]*)$/.test(value))) throw new TypeError(`invalid ${path}`);
      if (shape.format === "uint64" && BigInt(value as string) > 0xffffffffffffffffn) throw new TypeError(`invalid ${path}`);
      return;
    case "integer":
      if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new TypeError(`invalid ${path}`);
      if (shape.format === "uint16" && (value < 0 || value > 65535)) throw new TypeError(`invalid ${path}`);
      if (typeof shape.minimum === "number" && value < shape.minimum) throw new TypeError(`invalid ${path}`);
      if (typeof shape.maximum === "number" && value > shape.maximum) throw new TypeError(`invalid ${path}`);
      return;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`invalid ${path}`);
      if (typeof shape.minimum === "number" && value < shape.minimum) throw new TypeError(`invalid ${path}`);
      if (typeof shape.maximum === "number" && value > shape.maximum) throw new TypeError(`invalid ${path}`);
      return;
    case "boolean": if (typeof value !== "boolean") throw new TypeError(`invalid ${path}`); return;
    case "array":
      if (!Array.isArray(value)) throw new TypeError(`invalid ${path}`);
      for (const [index, item] of value.entries()) assertServiceValue(item, shape.items, definitions, `${path}[${index}]`);
      return;
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`invalid ${path}`);
      const fields = value as Record<string, unknown>;
      const properties = shape.properties as Record<string, unknown>;
      const required = Array.isArray(shape.required) ? shape.required as string[] : [];
      for (const field of required) if (!Object.hasOwn(fields, field)) throw new TypeError(`missing ${path}.${field}`);
      for (const [field, item] of Object.entries(fields)) {
        if (!Object.hasOwn(properties, field)) throw new TypeError(`unexpected ${path}.${field}`);
        assertServiceValue(item, properties[field], definitions, `${path}.${field}`);
      }
      return;
    }
    default: throw new TypeError(`unsupported schema for ${path}`);
  }
};

export const hydrateServiceValue = (value: unknown, schema: unknown, definitions: Record<string, unknown>): unknown => {
  const shape = schema as Record<string, unknown>;
  if (typeof shape.$ref === "string") return hydrateServiceValue(value, definitions[shape.$ref.slice(8)], definitions);
  const variants = shape.anyOf ?? shape.oneOf;
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      try { assertServiceValue(value, variant, definitions); return hydrateServiceValue(value, variant, definitions); }
      catch { /* try the next declared variant */ }
    }
  }
  if (Array.isArray(shape.type)) {
    for (const type of shape.type) {
      const variant = {...shape, type};
      try { assertServiceValue(value, variant, definitions); return hydrateServiceValue(value, variant, definitions); }
      catch { /* try the next declared type */ }
    }
  }
  if (shape.type === "string" && shape.format === "uint64") return BigInt(value as string);
  if (shape.type === "array") return (value as unknown[]).map(item => hydrateServiceValue(item, shape.items, definitions));
  if (shape.type === "object") {
    const properties = shape.properties as Record<string, unknown>;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, hydrateServiceValue(item, properties[key], definitions)]));
  }
  return value;
};
