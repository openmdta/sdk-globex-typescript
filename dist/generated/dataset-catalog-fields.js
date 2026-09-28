import { catalogField } from "../catalog.js";
import { DisplayName as CatalogModel0 } from "./catalog-globex.js";
import { InstrumentNames as CatalogModel1 } from "./catalog-openmdta.js";
import { Classification as CatalogModel2 } from "./catalog-openmdta.js";
import { InstrumentNames as CatalogModel3 } from "./catalog-openmdta.js";
import { ListingClassification as CatalogModel4 } from "./catalog-openmdta.js";
import { ListingOrderSize as CatalogModel5 } from "./catalog-openmdta.js";
import { ListingQuotation as CatalogModel6 } from "./catalog-openmdta.js";
import { ListingQuoteParameters as CatalogModel7 } from "./catalog-openmdta.js";
import { ListingTickSchedule as CatalogModel8 } from "./catalog-openmdta.js";
import { ListingTradingDates as CatalogModel9 } from "./catalog-openmdta.js";
import { ListingTradingRules as CatalogModel10 } from "./catalog-openmdta.js";
import { ListingVenue as CatalogModel11 } from "./catalog-openmdta.js";
export const DATASET_CATALOG_FIELDS = {
    "globex": [
        catalogField("DisplayName", CatalogModel0, "globexDisplayName"),
    ],
    "lus": [
        catalogField("instrument_names", CatalogModel1, "instrumentNames"),
    ],
    "xetra": [
        catalogField("classification", CatalogModel2, "classification"),
        catalogField("instrument_names", CatalogModel3, "instrumentNames"),
        catalogField("listing_classification", CatalogModel4, "listingClassification"),
        catalogField("listing_order_size", CatalogModel5, "listingOrderSize"),
        catalogField("listing_quotation", CatalogModel6, "listingQuotation"),
        catalogField("listing_quote_parameters", CatalogModel7, "listingQuoteParameters"),
        catalogField("listing_tick_schedule", CatalogModel8, "listingTickSchedule"),
        catalogField("listing_trading_dates", CatalogModel9, "listingTradingDates"),
        catalogField("listing_trading_rules", CatalogModel10, "listingTradingRules"),
        catalogField("listing_venue", CatalogModel11, "listingVenue"),
    ],
};
//# sourceMappingURL=dataset-catalog-fields.js.map