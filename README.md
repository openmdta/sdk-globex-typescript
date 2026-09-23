# `@globex/market-data`

Dependency-free browser client for Globex's multiplexed SBE market-data WebSocket.

```ts
import { connect, selector } from "@globex/market-data";

const con = await connect({ url: "wss://example.test/api/v1/ws", token: "site-token" });
// No venue suffix: each selector may resolve across all venues.
const requested = [selector.us("MSFT"), selector.us("AAPL")] as const;
const handle = con.select(requested).latestStream({
  blocks: ["BidAsk", "Trade", "BidDailyOhlc", "AskDailyOhlc", "TradeDailyOhlc"],
  adjustment: "split",
});

for await (const msg of handle) {
  // The exact selector says which branch of the request produced this message.
  console.log(msg.selector.expression, msg.datasetRecord); // US(MSFT) or US(AAPL)
  console.log(msg.fields.bidAsk?.bid?.price.toString());
  console.log(msg.fields.trade?.price.toString());
  console.log(msg.fields.tradeDailyOhlc?.day, msg.fields.tradeDailyOhlc?.closeLast.toString());

  for (const field of msg.fieldIterator()) console.log(field.name, field.value);
}

await handle.cancel();
await con.close();
```

Passing a non-empty selector tuple starts one native request per selector on the
same multiplexed WebSocket. The merged handle has one-message lookahead per
request, and `msg.selector` is the exact selector object for the branch that
produced that message. Cancelling the merged handle cancels every branch.

Prices are exact SDK `Decimal` values. Keep `toString()` for canonical output,
use `toLocaleString()` for display, and opt into the explicitly lossy
`toNumber()` only when a charting API requires a JavaScript number. Existing
decimal libraries can be used without an SDK dependency or adapter package:

```ts
import DecimalJs from "decimal.js";
import Big from "big.js";

const price = msg.fields.trade?.price;
const decimalPrice = price?.to(DecimalJs); // inferred as DecimalJs
const bigPrice = price?.to(Big);           // inferred as Big

price?.isNegative();
price?.toLocaleString("de-DE");

const bid = msg.fields.bidAsk?.bid?.price;
if (price && bid) console.log(price.compareTo(bid), price.equals(bid));
```

The bridge passes an exact canonical string to the supplied constructor; it
never converts through a JavaScript `number`. `toParts()` exposes the compact
wire representation only for low-level integrations.

An async iterable is the modern equivalent of a streaming callback: every
iteration awaits the next message. Call `handle.cancel()` to stop because of an
observed value, or pass an `AbortSignal` to stop from the outside. A `break`
also closes the iterator and cancels the request.

Reconnects are automatic. The client authenticates first and then replays every
open request with its original ID. Delivery is therefore at least once: a
finite request interrupted after yielding some messages can yield those messages
again after reconnecting.

The daily OHLC blocks use the `America/New_York` trading date. They are available
to snapshot, stream, and raw-timeseries requests; candle-timeseries requests
remain limited to `BidAskCandle` and `TradeCandle`.

Snapshot, stream, and timeseries calls accept `adjustment: "raw" | "split"`.
Raw is the default. Split mode reads confirmed numeric split ratios from the
consolidated Catalog, scales historical prices and quantities across each effective
date, and adjusts a daily block's previous close when a split is effective that day.
Stored source data is never changed. Catalog distributions are exposed as typed
dated values but are not yet applied as a total-return adjustment.

`tsRaw` and `tsCandle` accept an optional `quality` of `RT`, `DL`, or `EOD`.
Raw timeseries accepts `maxMessages`. Ordinary methods yield messages directly.
Use the matching `Batched` method when a chart engine should ingest arrays and
receive transport gaps without one iteration per message:

```ts
for await (const batch of con.tsRawBatched({
  selector: requested,
  blocks: ["BidAsk", "Trade"],
  from,
  through,
  maxMessages: 1_000,
})) {
  chart.append(batch.messages);
  console.log(batch.selector === requested, batch.datasetRecord, batch.gaps);
}
```

Snapshot and live stream messages include their requested selector and resolved
DatasetRecord reference because one selector may resolve to several records. Ordinary
timeseries methods omit that repeated context because they resolve one source;
their `Batched` variants carry it once per batch.
`tsRawStream` appends live rows after its snapshot; reconnect gaps require a fresh finite read.
`tsCandleStream` emits replacement values for the current live candle and takes
`updateIntervalMillis` (1,000 by default, zero for every event). Candle recovery
and gap refills are deliberately absent while streaming; cancel and open a new
snapshot to pick them up. EOD is finite-only.

Catalog field lists are projections. Leave `fields` out to request every field
using the Dataset metadata:

```ts
const records = con.dataset.iex.read({selector: requested});
for await (const record of records) {
  console.log(record.rawFields); // includes labels, subfields, codec descriptors and raw payloads
}
```

### Catalog dimensions and shared models

Dimension lookups return record sets; use the returned key to select an exact
source record. These requests use the same authenticated WSSBE connection:

```ts
import {CatalogModels} from "@globex/market-data";

const page = await conn.dataset.xetra.lookup({
  dimensions: {instrument: ["ISIN(CH0454664001)"], quotation_currency: ["CCY(USD)"]},
}).await();
const entities = await conn.dataset.gleif.lookup({
  expression: "LEI(529900T8BM49AURSDO55)",
}).await();

const fields = [{label: "classification", ...CatalogModels.Classification}] as const;
for await (const record of conn.dataset.xetra.read({
  selector: selector.raw("XETRA@globex", page.entries[0]!.key), fields,
})) {
  // Typed scheme map, not a last-value-wins scalar.
  console.log(record.fields.classification?.cfi?.code);
}
```

Omitted dimensions are unrestricted. Alternatives within a dimension are ORed;
different dimensions are ANDed on the same record. Identity aliases resolve only
for dimensions declared with an identity policy. Exchange/currency dimensions do
not create identity clusters. A missing requested dimension does not match.
`CatalogModels` supplies generated, header-validating shared SBE decoders, including
localized names, structured tick tiers, dated corporate actions, and distributions.
Supply dataset-local field labels in
catalog descriptors. `multiple: true` retains each subfield; scalar descriptors
reject repeated/subfield values.

### Shared UI state

Create one framework-neutral external store next to the application connection.
It keys accumulated state by `(dataset, datasetRecordKey)`, while retaining the
selector-to-record pointers needed when one selector resolves to several listings.
The last subscriber starts a grace timer rather than immediately closing the
upstream request.

React module setup (runs once when the module is initialized):

```ts
// market-data.ts
import {connect, createExternalStore} from "@globex/market-data";
export const connection = await connect(options);
export const marketData = createExternalStore(connection, {
  unsubscribeGraceMillis: 5_000,
  catalogExpiryMillis: 60 * 60_000,
});
```

Put React's three-argument external-store plumbing in application hooks once:

```ts
// use-market-data.ts
import {useSyncExternalStore} from "react";
import type {ExternalRecord, ExternalSelection, StreamBlockName} from "@globex/market-data";

export const useMarketDataSelection = <T extends StreamBlockName,>(value: ExternalSelection<T>) =>
  useSyncExternalStore(value.subscribe, value.getSnapshot, value.getSnapshot);
export const useMarketDataRecord = <T extends StreamBlockName,>(value: ExternalRecord<T>) =>
  useSyncExternalStore(value.subscribe, value.getSnapshot, value.getSnapshot);
```

The list subscribes only to membership. Each row subscribes to its own
accumulated record, so one quote does not rerender the complete DAX list:

```tsx
import {selector} from "@globex/market-data";
import type {ExternalRecord} from "@globex/market-data";
import {marketData} from "./market-data.js";
import {useMarketDataRecord, useMarketDataSelection} from "./use-market-data.js";

const dax = marketData.latestStream(selector.list("GER40"), ["BidAsk"]);

export function DaxStocks() {
  const membership = useMarketDataSelection(dax);
  return <>{membership.records.map(record => <DaxRow key={record.identity} record={record} />)}</>;
}

function DaxRow({record}: {record: ExternalRecord<"BidAsk">}) {
  const state = useMarketDataRecord(record);
  return <output>{state.fields.bidAsk?.bid?.price.toString() ?? "—"}</output>;
}
```

No `useMemo` is needed here. `marketData.stream` canonicalizes the selector and
block list and returns the same selection object for the same request. React's
subscription identity therefore stays stable even when the call is placed at a
component use-site instead of exported from the shared connection module.
Finite Catalog reads use the parallel Dataset namespace, for example
`await marketData.dataset.iex.read({selector: selector.us("MSFT")})`. They are
cached until `catalogExpiryMillis`; no Catalog subscription or upstream
connection is retained.

Svelte module setup is likewise a module singleton, not component-local state:

```ts
// market-data.svelte.ts
import {connect, createExternalStore} from "@globex/market-data";
const connection = await connect(options);
export const marketData = createExternalStore(connection, {unsubscribeGraceMillis: 5_000});
```

Svelte uses the same split between selection membership and each row's state;
`toReadable` is a tiny application adapter:

```svelte
<script lang="ts">
  import {readable} from "svelte/store";
  import {selector} from "@globex/market-data";
  import {marketData} from "./market-data.svelte.js";
  const toReadable = value => readable(value.getSnapshot(), set =>
    value.subscribe(() => set(value.getSnapshot()))
  );
  const membership = toReadable(marketData.latestStream(selector.list("GER40"), ["BidAsk"]));
</script>

{#each $membership.records as record (record.identity)}
  <DaxRow {record} />
{/each}
```

`DaxRow.svelte` subscribes only to its own accumulated record:

```svelte
<script lang="ts">
  import {readable} from "svelte/store";
  import type {ExternalRecord} from "@globex/market-data";

  let {record}: {record: ExternalRecord<"BidAsk">} = $props();
  const state = readable(record.getSnapshot(), set =>
    record.subscribe(() => set(record.getSnapshot()))
  );
</script>

<output>{$state.fields.bidAsk?.bid?.price.toString() ?? "—"}</output>
```

For website display, `catalogDisplayName(names, "de-CH", true)` selects the locale
pair and then its short name, falling back to long. It also accepts LegalEntityNames.
# List selectors

```ts
const selected = selector.list("GER40").venue("XETR");
const quotes = connection.select(selected).latestStream({blocks: ["BidAsk"]});
const xetraQuotes = connection.dataset.xetra.latestStream({selector: selected, blocks: ["BidAsk"]});
```

The Gateway chooses the list source Dataset; selecting a market-data Dataset does
not change the list source. `.venue("XETR", "XFRA")` selects a union, while
`.venue(["XETR", "XFRA"])` chooses the first available venue independently for
each member. Use MICs, not routing aliases. There are no `.at()`, `.venues()`, or
`.exchange()` aliases. Repeating `.venue()` replaces the previous preferences.

List members are identifiers only. Generic entity lists support Catalog reads,
lookup, and search; latest/stream methods require instrument lists. Timeseries
methods reject lists. Read metadata using the exact list record, for example
`selector.raw("BASE_LISTS@base", "LIST(GER40)")`, and `CatalogModels.ListDefinition`.
Index variants map return type and currency to distinct instrument identifiers;
they are not equivalent identifiers for the list.

Composition is fixed for a request and reread when it is replayed on reconnect.
`RequestHandle.onReplay()` exposes this boundary. The external store replaces
selection membership at that boundary while keeping cached record references
stable. Updating a quote only notifies that record's listeners.
