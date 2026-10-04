import {catalogField} from "../catalog.js";
import {DisplayName as CatalogModel0} from "./catalog-globex.js";
import {InstrumentNames as CatalogModel1} from "./catalog-openmdta.js";
import {InstrumentNames as CatalogModel2} from "./catalog-openmdta.js";
import {Classification as CatalogModel3} from "./catalog-openmdta.js";
import {InstrumentNames as CatalogModel4} from "./catalog-openmdta.js";
import {ListingClassification as CatalogModel5} from "./catalog-openmdta.js";
import {ListingOrderSize as CatalogModel6} from "./catalog-openmdta.js";
import {ListingQuotation as CatalogModel7} from "./catalog-openmdta.js";
import {ListingQuoteParameters as CatalogModel8} from "./catalog-openmdta.js";
import {ListingTickSchedule as CatalogModel9} from "./catalog-openmdta.js";
import {ListingTradingDates as CatalogModel10} from "./catalog-openmdta.js";
import {ListingTradingRules as CatalogModel11} from "./catalog-openmdta.js";
import {ListingVenue as CatalogModel12} from "./catalog-openmdta.js";
import {XetraListing as CatalogModel13} from "./catalog-xetra.js";
import {XetraMarketDetails as CatalogModel14} from "./catalog-xetra.js";
export const DATASET_CATALOG_FIELDS = {
  "globex": [
    catalogField("DisplayName", CatalogModel0, "globexDisplayName"),
  ],
  "lus": [
    catalogField("instrument_names", CatalogModel1, "instrumentNames"),
  ],
  "sim": [
    catalogField("instrument_names", CatalogModel2, "instrumentNames"),
  ],
  "xetra": [
    catalogField("classification", CatalogModel3, "classification"),
    catalogField("instrument_names", CatalogModel4, "instrumentNames"),
    catalogField("listing_classification", CatalogModel5, "listingClassification"),
    catalogField("listing_order_size", CatalogModel6, "listingOrderSize"),
    catalogField("listing_quotation", CatalogModel7, "listingQuotation"),
    catalogField("listing_quote_parameters", CatalogModel8, "listingQuoteParameters"),
    catalogField("listing_tick_schedule", CatalogModel9, "listingTickSchedule"),
    catalogField("listing_trading_dates", CatalogModel10, "listingTradingDates"),
    catalogField("listing_trading_rules", CatalogModel11, "listingTradingRules"),
    catalogField("listing_venue", CatalogModel12, "listingVenue"),
    catalogField("xetra_listing", CatalogModel13, "xetraXetraListing"),
    catalogField("xetra_market_details", CatalogModel14, "xetraXetraMarketDetails"),
  ],
} as const;
