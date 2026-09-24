/** Catalog fields use dataset metadata; callers may supply a decoder for a known semantic field. */
export interface CatalogFieldDescriptor<L extends string = string, V = unknown> {
    readonly label: L;
    readonly multiple?: boolean;
    readonly wireId?: number;
    readonly fixedLength?: number | null;
    decode(payload: Uint8Array): V;
}
/** Bind a dataset-local label to a generated Catalog model. */
export declare function catalogField<const L extends string, V, const M extends boolean>(label: L, model: {
    readonly multiple: M;
    decode(payload: Uint8Array): V;
}): CatalogFieldDescriptor<L, V> & {
    readonly multiple: M;
};
export type CatalogName = string;
export type CatalogValueMap = Record<string, Record<string, Uint8Array>>;
export type CatalogFieldName<C extends CatalogName> = keyof CatalogValueMap[C] & string;
export type CatalogFieldSelection<C extends CatalogName, F extends CatalogFieldName<C>> = {
    readonly [K in F]: Uint8Array;
};
export type CatalogDescriptorValue<D> = D extends CatalogFieldDescriptor<string, infer V> ? D extends {
    readonly multiple: true;
} ? Readonly<Record<string, V>> : V : never;
export type CatalogDescriptorSelection<D extends readonly CatalogFieldDescriptor[]> = {
    readonly [P in D[number] as P["label"]]: CatalogDescriptorValue<P>;
};
/** Choose a localized pair first, then fall back from short to long within it. */
export declare function catalogDisplayName(names: import("./generated/catalog-models.js").InstrumentNamesValue, language: string, short?: boolean): string;
//# sourceMappingURL=catalog.d.ts.map