export interface InstrumentNamesValue {
    readonly localized: readonly {
        readonly language: string;
        readonly long: string;
        readonly short: string;
    }[];
    readonly long: string;
    readonly short: string;
}
export declare const InstrumentNames: {
    readonly entityType: "INSTRUMENT";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => InstrumentNamesValue;
};
export interface LegalEntityNamesValue {
    readonly localized: readonly {
        readonly language: string;
        readonly long: string;
        readonly short: string;
    }[];
    readonly long: string;
    readonly short: string;
}
export declare const LegalEntityNames: {
    readonly entityType: "LEGAL_ENTITY";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => LegalEntityNamesValue;
};
export interface ClassificationValue {
    readonly code: string;
    readonly label: string;
}
export declare const Classification: {
    readonly entityType: "INSTRUMENT";
    readonly multiple: true;
    readonly decode: (payload: Uint8Array) => ClassificationValue;
};
export interface ListingClassificationValue {
    readonly code: string;
    readonly label: string;
}
export declare const ListingClassification: {
    readonly entityType: "LISTING";
    readonly multiple: true;
    readonly decode: (payload: Uint8Array) => ListingClassificationValue;
};
export interface ListingQuotationValue {
    readonly currency: string;
    readonly unit: string;
    readonly decimalDigits: string;
    readonly symbol: string;
}
export declare const ListingQuotation: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => ListingQuotationValue;
};
export interface ListingVenueValue {
    readonly mic: string;
    readonly primaryMic: string;
    readonly reportingMarket: string;
    readonly offBookReportingMarket: string;
}
export declare const ListingVenue: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => ListingVenueValue;
};
export interface ListingTradingDatesValue {
    readonly firstTradingDate: string;
    readonly lastTradingDate: string;
}
export declare const ListingTradingDates: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => ListingTradingDatesValue;
};
export interface ListingTradingRulesValue {
    readonly tradingModel: string;
    readonly closedBook: string;
    readonly marketImbalance: string;
    readonly auctionType: string;
    readonly quotingPeriodStart: string;
    readonly quotingPeriodEnd: string;
    readonly singleSidedQuotes: string;
    readonly crossMatchDefault: string;
}
export declare const ListingTradingRules: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => ListingTradingRulesValue;
};
export interface ListingQuoteParametersValue {
    readonly priceRange: string;
    readonly priceRangePercent: string;
    readonly minimumSize: string;
}
export declare const ListingQuoteParameters: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => ListingQuoteParametersValue;
};
export interface ListingOrderSizeValue {
    readonly minimumTradableUnit: string;
    readonly minimumOrderQuantity: string;
}
export declare const ListingOrderSize: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => ListingOrderSizeValue;
};
export interface ListingTickScheduleValue {
    readonly tiers: readonly {
        readonly upperBound: {
            readonly mantissa: bigint;
            readonly exponent: number;
        };
        readonly increment: {
            readonly mantissa: bigint;
            readonly exponent: number;
        };
    }[];
    readonly band: string;
}
export declare const ListingTickSchedule: {
    readonly entityType: "LISTING";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => ListingTickScheduleValue;
};
export interface InstrumentPrimaryListingValue {
    readonly catalog: string;
    readonly recordKey: string;
}
export declare const InstrumentPrimaryListing: {
    readonly entityType: "INSTRUMENT";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => InstrumentPrimaryListingValue;
};
export interface InstrumentListingRecordCountValue {
    readonly count: bigint;
}
export declare const InstrumentListingRecordCount: {
    readonly entityType: "INSTRUMENT";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => InstrumentListingRecordCountValue;
};
export interface CorporateActionsValue {
    readonly events: readonly {
        readonly kind: "Unknown" | "ShareSplit" | "StockDividend" | "RightsIssue" | "SpinOff" | "Merger" | "Other";
        readonly status: "Unknown" | "Announced" | "Confirmed" | "Cancelled";
        readonly newShares: bigint | null;
        readonly oldShares: bigint | null;
        readonly announcementDay: number | null;
        readonly recordDay: number | null;
        readonly eventId: string;
    }[];
}
export declare const CorporateActions: {
    readonly entityType: "INSTRUMENT";
    readonly multiple: true;
    readonly decode: (payload: Uint8Array) => CorporateActionsValue;
};
export interface DistributionsValue {
    readonly events: readonly {
        readonly kind: "Unknown" | "Dividend" | "Interest" | "ReturnOfCapital" | "CapitalGain" | "Other";
        readonly status: "Unknown" | "Announced" | "Confirmed" | "Cancelled";
        readonly amount: {
            readonly mantissa: bigint;
            readonly exponent: number;
        };
        readonly recordDay: number | null;
        readonly paymentDay: number | null;
        readonly currency: string;
        readonly eventId: string;
    }[];
}
export declare const Distributions: {
    readonly entityType: "INSTRUMENT";
    readonly multiple: true;
    readonly decode: (payload: Uint8Array) => DistributionsValue;
};
export interface ListDefinitionValue {
    readonly members: readonly {
        readonly identifier: string;
    }[];
    readonly variants: readonly {
        readonly returnType: string;
        readonly currency: string;
        readonly identifier: string;
    }[];
    readonly code: string;
    readonly name: string;
    readonly description: string;
    readonly kind: string;
    readonly memberDimension: string;
    readonly validAt: string;
}
export declare const ListDefinition: {
    readonly entityType: "LIST";
    readonly multiple: false;
    readonly decode: (payload: Uint8Array) => ListDefinitionValue;
};
//# sourceMappingURL=catalog-models.d.ts.map