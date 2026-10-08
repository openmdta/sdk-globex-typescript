import { catalogField } from "../catalog.js";
import { Classification as CatalogModel0 } from "./catalog-openmdta.js";
import { InstrumentNames as CatalogModel1 } from "./catalog-openmdta.js";
import { ListingQuotation as CatalogModel2 } from "./catalog-openmdta.js";
import { ListingTradingDates as CatalogModel3 } from "./catalog-openmdta.js";
import { ListingVenue as CatalogModel4 } from "./catalog-openmdta.js";
import { DisplayName as CatalogModel5 } from "./catalog-globex.js";
import { InstrumentNames as CatalogModel6 } from "./catalog-openmdta.js";
import { InstrumentNames as CatalogModel7 } from "./catalog-openmdta.js";
import { Classification as CatalogModel8 } from "./catalog-openmdta.js";
import { InstrumentNames as CatalogModel9 } from "./catalog-openmdta.js";
import { ListingClassification as CatalogModel10 } from "./catalog-openmdta.js";
import { ListingOrderSize as CatalogModel11 } from "./catalog-openmdta.js";
import { ListingQuotation as CatalogModel12 } from "./catalog-openmdta.js";
import { ListingQuoteParameters as CatalogModel13 } from "./catalog-openmdta.js";
import { ListingTickSchedule as CatalogModel14 } from "./catalog-openmdta.js";
import { ListingTradingDates as CatalogModel15 } from "./catalog-openmdta.js";
import { ListingTradingRules as CatalogModel16 } from "./catalog-openmdta.js";
import { ListingVenue as CatalogModel17 } from "./catalog-openmdta.js";
import { XetraListing as CatalogModel18 } from "./catalog-xetra.js";
import { XetraMarketDetails as CatalogModel19 } from "./catalog-xetra.js";
export const DATASET_CATALOG_FIELDS = {
    "firds": [
        catalogField("classification", CatalogModel0, "classification"),
        catalogField("instrument_names", CatalogModel1, "instrumentNames"),
        catalogField("listing_quotation", CatalogModel2, "listingQuotation"),
        catalogField("listing_trading_dates", CatalogModel3, "listingTradingDates"),
        catalogField("listing_venue", CatalogModel4, "listingVenue"),
    ],
    "globex": [
        catalogField("DisplayName", CatalogModel5, "globexDisplayName"),
    ],
    "lus": [
        catalogField("instrument_names", CatalogModel6, "instrumentNames"),
    ],
    "sim": [
        catalogField("instrument_names", CatalogModel7, "instrumentNames"),
    ],
    "xetra": [
        catalogField("classification", CatalogModel8, "classification"),
        catalogField("instrument_names", CatalogModel9, "instrumentNames"),
        catalogField("listing_classification", CatalogModel10, "listingClassification"),
        catalogField("listing_order_size", CatalogModel11, "listingOrderSize"),
        catalogField("listing_quotation", CatalogModel12, "listingQuotation"),
        catalogField("listing_quote_parameters", CatalogModel13, "listingQuoteParameters"),
        catalogField("listing_tick_schedule", CatalogModel14, "listingTickSchedule"),
        catalogField("listing_trading_dates", CatalogModel15, "listingTradingDates"),
        catalogField("listing_trading_rules", CatalogModel16, "listingTradingRules"),
        catalogField("listing_venue", CatalogModel17, "listingVenue"),
        catalogField("xetra_listing", CatalogModel18, "xetraXetraListing"),
        catalogField("xetra_market_details", CatalogModel19, "xetraXetraMarketDetails"),
    ],
};
//# sourceMappingURL=dataset-catalog-fields.js.map