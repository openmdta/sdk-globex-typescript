export interface XetraListingValue {
    readonly productId: string;
    readonly productStatus: string;
    readonly instrumentStatus: string;
    readonly inSubscription: string;
    readonly disableOnBookTrading: string;
    readonly midpointTrading: string;
    readonly midpointExecutionVenueId: string;
    readonly ccpEligibleCode: string;
    readonly clearingLocation: string;
    readonly settlementPeriod: string;
    readonly settlementCurrency: string;
    readonly multiCcpEligible: string;
    readonly depositType: string;
    readonly maximumOrderQuantity: string;
    readonly maximumOrderValue: string;
    readonly minimumIcebergTotalVolume: string;
    readonly minimumIcebergDisplayVolume: string;
}
export declare const XetraListing: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => XetraListingValue;
};
export interface XetraMarketDetailsValue {
    readonly participants: readonly {
        readonly role: string;
        readonly memberId: string;
        readonly name: string;
    }[];
    readonly liquidityProviderUserGroup: string;
    readonly specialistUserGroup: string;
}
export declare const XetraMarketDetails: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => XetraMarketDetailsValue;
};
//# sourceMappingURL=catalog-xetra.d.ts.map