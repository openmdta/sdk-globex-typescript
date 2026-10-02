export declare const DATASET_CATALOG_FIELDS: {
    readonly globex: readonly [import("../catalog.js").CatalogFieldDescriptor<"DisplayName", import("./catalog-globex.js").DisplayNameValue> & {
        readonly multiple: false;
        readonly property: "globexDisplayName";
    }];
    readonly lus: readonly [import("../catalog.js").CatalogFieldDescriptor<"instrument_names", import("./catalog-openmdta.js").InstrumentNamesValue> & {
        readonly multiple: false;
        readonly property: "instrumentNames";
    }];
    readonly xetra: readonly [import("../catalog.js").CatalogFieldDescriptor<"classification", import("./catalog-openmdta.js").ClassificationValue> & {
        readonly multiple: true;
        readonly property: "classification";
    }, import("../catalog.js").CatalogFieldDescriptor<"instrument_names", import("./catalog-openmdta.js").InstrumentNamesValue> & {
        readonly multiple: false;
        readonly property: "instrumentNames";
    }, import("../catalog.js").CatalogFieldDescriptor<"listing_classification", import("./catalog-openmdta.js").ListingClassificationValue> & {
        readonly multiple: true;
        readonly property: "listingClassification";
    }, import("../catalog.js").CatalogFieldDescriptor<"listing_order_size", import("./catalog-openmdta.js").ListingOrderSizeValue> & {
        readonly multiple: false;
        readonly property: "listingOrderSize";
    }, import("../catalog.js").CatalogFieldDescriptor<"listing_quotation", import("./catalog-openmdta.js").ListingQuotationValue> & {
        readonly multiple: false;
        readonly property: "listingQuotation";
    }, import("../catalog.js").CatalogFieldDescriptor<"listing_quote_parameters", import("./catalog-openmdta.js").ListingQuoteParametersValue> & {
        readonly multiple: false;
        readonly property: "listingQuoteParameters";
    }, import("../catalog.js").CatalogFieldDescriptor<"listing_tick_schedule", import("./catalog-openmdta.js").ListingTickScheduleValue> & {
        readonly multiple: false;
        readonly property: "listingTickSchedule";
    }, import("../catalog.js").CatalogFieldDescriptor<"listing_trading_dates", import("./catalog-openmdta.js").ListingTradingDatesValue> & {
        readonly multiple: false;
        readonly property: "listingTradingDates";
    }, import("../catalog.js").CatalogFieldDescriptor<"listing_trading_rules", import("./catalog-openmdta.js").ListingTradingRulesValue> & {
        readonly multiple: false;
        readonly property: "listingTradingRules";
    }, import("../catalog.js").CatalogFieldDescriptor<"listing_venue", import("./catalog-openmdta.js").ListingVenueValue> & {
        readonly multiple: false;
        readonly property: "listingVenue";
    }, import("../catalog.js").CatalogFieldDescriptor<"xetra_listing", import("./catalog-xetra.js").XetraListingValue> & {
        readonly multiple: false;
        readonly property: "xetraXetraListing";
    }, import("../catalog.js").CatalogFieldDescriptor<"xetra_market_details", import("./catalog-xetra.js").XetraMarketDetailsValue> & {
        readonly multiple: false;
        readonly property: "xetraXetraMarketDetails";
    }];
};
//# sourceMappingURL=dataset-catalog-fields.d.ts.map