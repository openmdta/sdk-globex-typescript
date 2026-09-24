export declare const KEYFIGURES_CONTRACTS: {
    readonly "BRINDLE@brindle": {
        readonly blocks: readonly [{
            readonly format: {
                readonly blockLength: 24;
                readonly prefixLength: 4;
                readonly version: 0;
            };
            readonly members: {
                readonly midpoint: {
                    readonly nullable: true;
                    readonly offset: 0;
                    readonly primitiveType: "double";
                    readonly type: "number";
                };
                readonly spread: {
                    readonly nullable: true;
                    readonly offset: 8;
                    readonly primitiveType: "double";
                    readonly type: "number";
                };
                readonly spreadPercent: {
                    readonly nullable: true;
                    readonly offset: 16;
                    readonly primitiveType: "double";
                    readonly type: "number";
                };
            };
            readonly message: "QuoteFigures";
            readonly projection: {
                readonly midpoint: "midpoint";
                readonly spread: "spread";
                readonly spreadPercent: "spread_percent";
            };
            readonly semantic: "brindle::QuoteFigures";
        }];
        readonly calculator: "quote-figures";
        readonly catalog: "BRINDLE@brindle";
        readonly dependencies: readonly [];
        readonly fields: readonly [{
            readonly columnId: 0;
            readonly facet: true;
            readonly filter: "equals";
            readonly label: "Instrument";
            readonly missing: "first";
            readonly multiple: false;
            readonly name: "id";
            readonly nullable: false;
            readonly sort: true;
            readonly source: "catalog.record_key";
            readonly type: "string";
        }, {
            readonly columnId: 1;
            readonly filter: "contains";
            readonly label: "Name";
            readonly missing: "first";
            readonly multiple: false;
            readonly name: "name";
            readonly nullable: false;
            readonly selector: {
                readonly field: "openmdta::BasicMasterdata";
                readonly member: "/name";
            };
            readonly sort: true;
            readonly source: "openmdta::BasicMasterdata.name";
            readonly type: "string";
        }, {
            readonly columnId: 2;
            readonly facet: true;
            readonly filter: "equals";
            readonly label: "Listing key";
            readonly missing: "first";
            readonly multiple: false;
            readonly name: "symbol";
            readonly nullable: true;
            readonly sort: true;
            readonly source: "openmdta::CatalogMembership.record_key";
            readonly type: "string";
        }, {
            readonly columnId: 3;
            readonly filter: "range";
            readonly label: "Bid";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "bid";
            readonly nullable: true;
            readonly numericId: 0;
            readonly sort: true;
            readonly source: "openmdta::BidAsk.bid.price";
            readonly type: "number";
        }, {
            readonly columnId: 4;
            readonly filter: "range";
            readonly label: "Ask";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "ask";
            readonly nullable: true;
            readonly numericId: 1;
            readonly sort: true;
            readonly source: "openmdta::BidAsk.ask.price";
            readonly type: "number";
        }, {
            readonly columnId: 5;
            readonly filter: "range";
            readonly label: "Midpoint";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "midpoint";
            readonly nullable: true;
            readonly numericId: 2;
            readonly sort: true;
            readonly source: "brindle::QuoteFigures.midpoint";
            readonly type: "number";
        }, {
            readonly columnId: 6;
            readonly filter: "range";
            readonly label: "Spread";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "spread";
            readonly nullable: true;
            readonly numericId: 3;
            readonly sort: true;
            readonly source: "brindle::QuoteFigures.spread";
            readonly type: "number";
        }, {
            readonly columnId: 7;
            readonly filter: "range";
            readonly label: "Spread %";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "spread_percent";
            readonly nullable: true;
            readonly numericId: 4;
            readonly sort: true;
            readonly source: "brindle::QuoteFigures.spreadPercent";
            readonly type: "number";
        }, {
            readonly columnId: 8;
            readonly filter: "range";
            readonly label: "Lot size";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "lot_size";
            readonly nullable: true;
            readonly selector: {
                readonly field: "brindle::Listing";
                readonly member: "/lotSize";
            };
            readonly sort: true;
            readonly source: "brindle::Listing.lotSize";
            readonly type: "integer";
        }, {
            readonly columnId: 9;
            readonly filter: "equals";
            readonly label: "Primary";
            readonly missing: "first";
            readonly multiple: false;
            readonly name: "primary";
            readonly nullable: false;
            readonly selector: {
                readonly field: "brindle::Listing";
                readonly member: "/primary";
            };
            readonly sort: true;
            readonly source: "brindle::Listing.primary";
            readonly type: "boolean";
        }];
        readonly fingerprint: "ce8f17882d1b6c000f8fb3285f6cdd9cb6a3471116e517857ea8089c171c04c2";
        readonly productQuote: "openmdta::BidAsk";
        readonly version: 1;
    };
    readonly "GLOBEX@globex": {
        readonly blocks: readonly [{
            readonly format: {
                readonly blockLength: 24;
                readonly prefixLength: 4;
                readonly version: 0;
            };
            readonly members: {
                readonly midpoint: {
                    readonly nullable: true;
                    readonly offset: 0;
                    readonly primitiveType: "double";
                    readonly type: "number";
                };
                readonly spread: {
                    readonly nullable: true;
                    readonly offset: 8;
                    readonly primitiveType: "double";
                    readonly type: "number";
                };
                readonly spreadPercent: {
                    readonly nullable: true;
                    readonly offset: 16;
                    readonly primitiveType: "double";
                    readonly type: "number";
                };
            };
            readonly message: "QuoteFigures";
            readonly projection: {
                readonly midpoint: "midpoint";
                readonly spread: "spread";
                readonly spreadPercent: "spread_percent";
            };
            readonly semantic: "globex::QuoteFigures";
        }];
        readonly calculator: "quote-figures";
        readonly catalog: "GLOBEX@globex";
        readonly dependencies: readonly [{
            readonly maxCount: 1;
            readonly maxSkewMs: 300000;
            readonly multiple: false;
            readonly name: "underlyings";
            readonly quoteInput: "openmdta::BidAsk";
            readonly selector: {
                readonly field: "xetra::DerivativeTerms";
                readonly member: "/underlying";
            };
        }];
        readonly fields: readonly [{
            readonly columnId: 0;
            readonly facet: true;
            readonly filter: "equals";
            readonly label: "Instrument";
            readonly missing: "first";
            readonly multiple: false;
            readonly name: "id";
            readonly nullable: false;
            readonly sort: true;
            readonly source: "catalog.record_key";
            readonly type: "string";
        }, {
            readonly columnId: 1;
            readonly filter: "contains";
            readonly label: "Name";
            readonly missing: "first";
            readonly multiple: false;
            readonly name: "name";
            readonly nullable: false;
            readonly selector: {
                readonly field: "openmdta::BasicMasterdata";
                readonly member: "/name";
            };
            readonly sort: true;
            readonly source: "openmdta::BasicMasterdata.name";
            readonly type: "string";
        }, {
            readonly columnId: 2;
            readonly facet: true;
            readonly filter: "equals";
            readonly label: "Listing key";
            readonly missing: "first";
            readonly multiple: false;
            readonly name: "symbol";
            readonly nullable: true;
            readonly sort: true;
            readonly source: "openmdta::CatalogMembership.record_key";
            readonly type: "string";
        }, {
            readonly columnId: 3;
            readonly facet: true;
            readonly filter: "equals";
            readonly label: "Asset class";
            readonly missing: "first";
            readonly multiple: false;
            readonly name: "asset_class";
            readonly nullable: false;
            readonly selector: {
                readonly field: "globex::AssetClass";
                readonly member: "/value";
            };
            readonly sort: true;
            readonly source: "globex::AssetClass.value";
            readonly type: "string";
        }, {
            readonly columnId: 4;
            readonly filter: "range";
            readonly label: "Bid";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "bid";
            readonly nullable: true;
            readonly numericId: 0;
            readonly sort: true;
            readonly source: "openmdta::BidAsk.bid.price";
            readonly type: "number";
            readonly unit: "source price units";
        }, {
            readonly columnId: 5;
            readonly filter: "range";
            readonly label: "Ask";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "ask";
            readonly nullable: true;
            readonly numericId: 1;
            readonly sort: true;
            readonly source: "openmdta::BidAsk.ask.price";
            readonly type: "number";
            readonly unit: "source price units";
        }, {
            readonly columnId: 6;
            readonly filter: "range";
            readonly label: "Midpoint";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "midpoint";
            readonly nullable: true;
            readonly numericId: 2;
            readonly sort: true;
            readonly source: "globex::QuoteFigures.midpoint";
            readonly type: "number";
            readonly unit: "source price units";
        }, {
            readonly columnId: 7;
            readonly filter: "range";
            readonly label: "Spread";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "spread";
            readonly nullable: true;
            readonly numericId: 3;
            readonly sort: true;
            readonly source: "globex::QuoteFigures.spread";
            readonly type: "number";
            readonly unit: "source price units";
        }, {
            readonly columnId: 8;
            readonly filter: "range";
            readonly label: "Spread %";
            readonly missing: "exclude";
            readonly multiple: false;
            readonly name: "spread_percent";
            readonly nullable: true;
            readonly numericId: 4;
            readonly sort: true;
            readonly source: "globex::QuoteFigures.spreadPercent";
            readonly type: "number";
            readonly unit: "percent";
        }];
        readonly fingerprint: "c6b6a9e1485e4fc7a0714fc9e55599ba73c752425b739dd042387c0ab0339c1b";
        readonly productQuote: "openmdta::BidAsk";
        readonly version: 1;
    };
};
//# sourceMappingURL=keyfigures.d.ts.map