/** Catalog fields use dataset metadata; callers may supply a decoder for a known semantic field. */
export interface CatalogFieldDescriptor<L extends string = string, V = unknown> {
  readonly label: L;
  readonly property?: string;
  readonly multiple?: boolean;
  readonly wireId?: number;
  readonly fixedLength?: number | null;
  decode(payload: Uint8Array): V;
}
/** Bind a dataset-local label to a generated Catalog model. */
export function catalogField<const L extends string, V, const M extends boolean>(
  label: L,
  model: {readonly multiple: M; decode(payload: Uint8Array): V},
): CatalogFieldDescriptor<L, V> & {readonly multiple: M};
export function catalogField<const L extends string, V, const M extends boolean, const P extends string>(
  label: L,
  model: {readonly multiple: M; decode(payload: Uint8Array): V},
  property: P,
): CatalogFieldDescriptor<L, V> & {readonly multiple: M; readonly property: P};
export function catalogField<const L extends string, V, const M extends boolean>(
  label: L,
  model: {readonly multiple: M; decode(payload: Uint8Array): V},
  property?: string,
): CatalogFieldDescriptor<L, V> & {readonly multiple: M} {
  if (!label.trim()) throw new TypeError("Catalog field label must not be empty");
  return {label, ...(property === undefined ? {} : {property}), multiple: model.multiple, decode: payload => model.decode(payload)};
}
export type CatalogName = string;
export type CatalogValueMap = Record<string, Record<string, Uint8Array>>;
export type CatalogFieldName<C extends CatalogName> = keyof CatalogValueMap[C] & string;
export type CatalogFieldSelection<C extends CatalogName, F extends CatalogFieldName<C>> = { readonly [K in F]: Uint8Array };
export type CatalogDescriptorValue<D> = D extends CatalogFieldDescriptor<string, infer V> ? D extends {readonly multiple: true} ? Readonly<Record<string, V>> : V : never;
export type CatalogDescriptorSelection<D extends readonly CatalogFieldDescriptor[]> = {
  readonly [P in D[number] as P extends {readonly property: infer Name extends string} ? Name : P["label"]]: CatalogDescriptorValue<P>;
};

/** Choose a localized pair first, then fall back from short to long within it. */
export function catalogDisplayName(names: {readonly long: string; readonly short: string; readonly localized: readonly {readonly language: string; readonly long: string; readonly short: string}[]}, language: string, short = false): string {
  const requested = language.toLowerCase(), base = requested.split("-")[0];
  const selected = names.localized.find(value => value.language.toLowerCase() === requested)
    ?? names.localized.find(value => value.language.toLowerCase() === base)
    ?? names;
  return short && selected.short ? selected.short : selected.long;
}
