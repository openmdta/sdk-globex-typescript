export interface ListingSelector {
    readonly dataset: string;
    readonly quality: "RT" | "DL" | "EOD";
    readonly key: string;
    readonly progressOnly?: boolean;
    readonly blocks: readonly number[];
}
export interface ListingEvent {
    readonly source: ListingSelector;
    readonly incarnation: string;
    readonly snapshot: boolean;
    readonly connected: boolean;
    readonly coverageFence: bigint;
    readonly progressUs: bigint | null;
    readonly gapped: boolean;
    readonly gapThroughId: bigint;
    readonly blocks: readonly {
        readonly id: number;
        readonly messageId: bigint;
        readonly eventUs: bigint;
        readonly clear: boolean;
        readonly requirements: {
            readonly clauses: readonly ("Public" | {
                readonly AnyOf: readonly {
                    readonly namespace: string;
                    readonly license: string;
                }[];
            })[];
        };
        readonly payload: Uint8Array;
    }[];
}
export declare function decodeListingEvent(bytes: Uint8Array): ListingEvent;
//# sourceMappingURL=listing.d.ts.map