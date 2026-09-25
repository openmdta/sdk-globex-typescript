export class ServiceError extends Error {
    code;
    serviceId;
    command;
    outcome;
    mutationId;
    details;
    name = "ServiceError";
    constructor(code, serviceId, command, outcome, mutationId, details, message) {
        super(message);
        this.code = code;
        this.serviceId = serviceId;
        this.command = command;
        this.outcome = outcome;
        this.mutationId = mutationId;
        this.details = details;
    }
}
/** Intentionally small JSON Schema subset. Unsupported keywords fail generation. */
export const assertServiceValue = (value, schema, definitions, path = "value") => {
    if (typeof schema !== "object" || schema === null)
        throw new TypeError(`invalid schema for ${path}`);
    const shape = schema;
    if (typeof shape.$ref === "string") {
        const name = shape.$ref.startsWith("#/$defs/") ? shape.$ref.slice(8) : "";
        if (!name || !Object.hasOwn(definitions, name))
            throw new TypeError(`unknown schema reference for ${path}`);
        assertServiceValue(value, definitions[name], definitions, path);
        return;
    }
    const variants = shape.anyOf ?? shape.oneOf;
    if (Array.isArray(variants)) {
        if (!variants.some(variant => {
            try {
                assertServiceValue(value, variant, definitions, path);
                return true;
            }
            catch {
                return false;
            }
        }))
            throw new TypeError(`invalid ${path}`);
        return;
    }
    if (Array.isArray(shape.type)) {
        assertServiceValue(value, { ...shape, anyOf: shape.type.map(type => ({ ...shape, type })) }, definitions, path);
        return;
    }
    if (Array.isArray(shape.enum)) {
        if (!shape.enum.some(item => item === value))
            throw new TypeError(`invalid ${path}`);
        return;
    }
    switch (shape.type) {
        case "null":
            if (value !== null)
                throw new TypeError(`invalid ${path}`);
            return;
        case "string":
            if (typeof value !== "string" || (shape.format === "uint64" && !/^(0|[1-9][0-9]*)$/.test(value)))
                throw new TypeError(`invalid ${path}`);
            if (shape.format === "uint64" && BigInt(value) > 0xffffffffffffffffn)
                throw new TypeError(`invalid ${path}`);
            return;
        case "integer":
            if (typeof value !== "number" || !Number.isSafeInteger(value))
                throw new TypeError(`invalid ${path}`);
            if (shape.format === "uint16" && (value < 0 || value > 65535))
                throw new TypeError(`invalid ${path}`);
            if (typeof shape.minimum === "number" && value < shape.minimum)
                throw new TypeError(`invalid ${path}`);
            if (typeof shape.maximum === "number" && value > shape.maximum)
                throw new TypeError(`invalid ${path}`);
            return;
        case "number":
            if (typeof value !== "number" || !Number.isFinite(value))
                throw new TypeError(`invalid ${path}`);
            if (typeof shape.minimum === "number" && value < shape.minimum)
                throw new TypeError(`invalid ${path}`);
            if (typeof shape.maximum === "number" && value > shape.maximum)
                throw new TypeError(`invalid ${path}`);
            return;
        case "boolean":
            if (typeof value !== "boolean")
                throw new TypeError(`invalid ${path}`);
            return;
        case "array":
            if (!Array.isArray(value))
                throw new TypeError(`invalid ${path}`);
            for (const [index, item] of value.entries())
                assertServiceValue(item, shape.items, definitions, `${path}[${index}]`);
            return;
        case "object": {
            if (typeof value !== "object" || value === null || Array.isArray(value))
                throw new TypeError(`invalid ${path}`);
            const fields = value;
            const properties = shape.properties;
            const required = Array.isArray(shape.required) ? shape.required : [];
            for (const field of required)
                if (!Object.hasOwn(fields, field))
                    throw new TypeError(`missing ${path}.${field}`);
            for (const [field, item] of Object.entries(fields)) {
                if (!Object.hasOwn(properties, field))
                    throw new TypeError(`unexpected ${path}.${field}`);
                assertServiceValue(item, properties[field], definitions, `${path}.${field}`);
            }
            return;
        }
        default: throw new TypeError(`unsupported schema for ${path}`);
    }
};
export const hydrateServiceValue = (value, schema, definitions) => {
    const shape = schema;
    if (typeof shape.$ref === "string")
        return hydrateServiceValue(value, definitions[shape.$ref.slice(8)], definitions);
    const variants = shape.anyOf ?? shape.oneOf;
    if (Array.isArray(variants)) {
        for (const variant of variants) {
            try {
                assertServiceValue(value, variant, definitions);
                return hydrateServiceValue(value, variant, definitions);
            }
            catch { /* try the next declared variant */ }
        }
    }
    if (Array.isArray(shape.type)) {
        for (const type of shape.type) {
            const variant = { ...shape, type };
            try {
                assertServiceValue(value, variant, definitions);
                return hydrateServiceValue(value, variant, definitions);
            }
            catch { /* try the next declared type */ }
        }
    }
    if (shape.type === "string" && shape.format === "uint64")
        return BigInt(value);
    if (shape.type === "array")
        return value.map(item => hydrateServiceValue(item, shape.items, definitions));
    if (shape.type === "object") {
        const properties = shape.properties;
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, hydrateServiceValue(item, properties[key], definitions)]));
    }
    return value;
};
//# sourceMappingURL=service.js.map