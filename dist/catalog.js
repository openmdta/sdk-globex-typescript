/** Bind a dataset-local label to a generated Catalog model. */
export function catalogField(label, model) {
    if (!label.trim())
        throw new TypeError("Catalog field label must not be empty");
    return { label, multiple: model.multiple, decode: payload => model.decode(payload) };
}
/** Choose a localized pair first, then fall back from short to long within it. */
export function catalogDisplayName(names, language, short = false) {
    const requested = language.toLowerCase(), base = requested.split("-")[0];
    const selected = names.localized.find(value => value.language.toLowerCase() === requested)
        ?? names.localized.find(value => value.language.toLowerCase() === base)
        ?? names;
    return short && selected.short ? selected.short : selected.long;
}
//# sourceMappingURL=catalog.js.map