/** Shared transport options for generated application service commands. */
export interface ServiceCallOptions {
    readonly timeoutMs?: number;
    readonly retry?: "transport" | "never";
    readonly signal?: AbortSignal;
    /** Reuse a persisted operation ID when recovering a backend job. */
    readonly mutationId?: string;
}
export type MutationOutcome = "not_applied" | "unknown";
export declare class ServiceError extends Error {
    readonly code: string;
    readonly serviceId: string;
    readonly command: string;
    readonly outcome: MutationOutcome;
    readonly mutationId: string | undefined;
    readonly details: unknown;
    readonly name = "ServiceError";
    constructor(code: string, serviceId: string, command: string, outcome: MutationOutcome, mutationId: string | undefined, details: unknown, message: string);
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
export declare const assertServiceValue: (value: unknown, schema: unknown, definitions: Record<string, unknown>, path?: string) => void;
export declare const hydrateServiceValue: (value: unknown, schema: unknown, definitions: Record<string, unknown>) => unknown;
//# sourceMappingURL=service.d.ts.map