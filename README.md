# stadfangaskra

Icelandic address registry (**Staðfangaskrá**) lookup for TypeScript, Cloudflare
Workers and Node — a **zero-dependency, edge-native** port of the data layer of
Sveinbjörn Þórðarson's excellent Python library
[`iceaddr`](https://github.com/sveinbjornt/iceaddr).

`iceaddr` is the canonical tool for Icelandic addresses, but it's Python with a
bundled SQLite database. There was no equivalent you could run in a V8 isolate
(Cloudflare Workers, Deno, Bun) or drop into a TypeScript project. This package
fills that gap: pure functions, no native code, no database required, and it
ships **no address data** — it fetches the registry live from the public HMS
export and you keep it wherever you like (memory, KV, Postgres).

> **Credit where it's due.** This is an independent reimplementation that mirrors
> iceaddr's semantics; the postcode table is ported from iceaddr (BSD-3-Clause).
> All the hard-won design — which columns matter, the cleaning rules, the search
> behaviour — comes from Sveinbjörn's original. See [NOTICE.md](NOTICE.md).

## Install

```sh
npm install stadfangaskra      # or: pnpm add stadfangaskra
```

ESM and CommonJS builds are both shipped. Node 18+ (for `fetch` / Web Streams)
or any modern edge runtime.

## Quick start

```ts
import { loadStadfangaskra, createAddressIndex } from "stadfangaskra";

// 1. Fetch + clean the registry straight from HMS (~139k records, no data is
//    bundled in this package). Do this at startup, or on a schedule.
const addresses = await loadStadfangaskra();

// 2. Build an in-memory index for fast lookups.
const ix = createAddressIndex(addresses);

// 3. Autocomplete — house-number prefix matching included.
ix.search("Gullengi 3");
//=> [{ streetNf: "Gullengi", houseNumber: 3, ..., display: "Gullengi 3, 112 Reykjavík" },
//    { ..., houseNumber: 31 }, { ..., houseNumber: 33 }, ...]

// 4. Strict validation of a typed-in address.
ix.validate({ street: "Njálsgata", houseNumber: 8, houseLetter: "c", postalCode: "101" });
//=> { hnitnum: 10001..., display: "Njálsgata 8c, 101 Reykjavík", city: "Reykjavík", ... }

// 5. Re-resolve a previously selected address by its stable id.
ix.lookupByHnitnum(10001234);
```

## What you get

The library has four layers; import only what you need.

### Core — pure CSV parsing & cleaning (zero data)

```ts
import { parseCsvLine, cleanAddressRow, validateHeader, parseAddressQuery } from "stadfangaskra";

parseAddressQuery("Njálsgata 8C");
//=> { street: "Njálsgata", number: 8, letter: "c" }
```

`cleanAddressRow` / `validateHeader` / `parseCsvLine` / `haversineKm` plus the
`CleanAddress` and `ParsedAddressQuery` types. This is the data-free core — it
applies the same filtering iceaddr does (drop rows with no stable id or street,
postcode outside the known set, coordinates outside Iceland; comma-decimal →
dot; lower-case house letters).

Each record carries both identifiers, mirroring iceaddr: `hnitnum` (the
coordinate point, **not** unique per address) and `heinum` (the address itself,
the stable id you join on). Tracking
[iceaddr#16](https://github.com/sveinbjornt/iceaddr/pull/16) by Jökull Sólberg.

### Fetch — the registry, live from HMS (no data redistributed)

```ts
import { streamStadfangaskra, loadStadfangaskra, STADFANGASKRA_URL } from "stadfangaskra";

// Stream record-by-record (constant memory) ...
for await (const a of streamStadfangaskra()) { /* ... */ }

// ... or collect them all.
const all = await loadStadfangaskra();
```

Options: `{ url?, fetch?, knownPostcodes?, signal? }`. The header is validated
first and the call **throws if the upstream CSV schema has drifted**, so a
silent change at HMS can't quietly corrupt your data.

### Lookup — in-memory search / validate (no DB)

`createAddressIndex(addresses)` → an `AddressIndex` with `.search(query, {limit})`,
`.validate({street, houseNumber, houseLetter, postalCode})`, and
`.lookupByHnitnum(id)`. Results carry a composed `display` line and a `city` /
`region` resolved from the bundled postcode table.

For very high query volumes, a Postgres + `pg_trgm` index is the scalable path
(see *Reference: a Postgres-resident service* below); the in-memory index is
ideal for scripts, edge functions with the dataset in memory/KV, and tests.

### Postcodes — the one bundled dataset

```ts
import { POSTCODES, postcodeLookup, knownPostcodes } from "stadfangaskra/postcodes";

postcodeLookup("101");
//=> { code: "101", nominative: "Reykjavík", dative: "Reykjavík",
//     region: "Höfuðborgarsvæðið", description: "Miðborg", kind: "Stærra dreifbýli" }
```

195 postcodes with nominative + dative place names and region info, ported from
iceaddr. Importing from `stadfangaskra/postcodes` keeps it separate from the
data-free core.

## A note on the data

This package ships only the postcode table. The ~139k address records are
**fetched at runtime** from the public HMS export and never redistributed here.
The address data is published by **HMS / Þjóðskrá Íslands** under **CC-BY 4.0** —
if you ship it in a product, attribute it: *"Staðfangaskrá by HMS / Þjóðskrá
Íslands, CC-BY 4.0"*. See [NOTICE.md](NOTICE.md) for the full picture.

The registry refreshes upstream often (at least daily). A typical setup fetches
it on a schedule (a daily/weekly cron) and serves lookups from the loaded set.

## Reference: a Postgres-resident service

This package is the in-memory / streaming half of the picture. The original
production deployment loads the cleaned records into Postgres and serves
autocomplete via a `pg_trgm` trigram index with a weekly refresh job — the
scalable shape for high traffic. That design (schema, indexes, the atomic-swap
refresh, the `DISTINCT ON (hnitnum)` dedup needed because the upstream CSV is not
unique on `hnitnum`) is written up in the companion design note and is meant to
be copied and adapted, not consumed as a library.

## Development

```sh
pnpm install
pnpm build        # tsdown → dual ESM/CJS + .d.ts
pnpm test         # vitest
pnpm lint         # oxlint
pnpm typecheck    # tsc --noEmit
```

## License

MIT (this package's code). Bundled postcode data is from `iceaddr`
(BSD-3-Clause); runtime-fetched address data is CC-BY 4.0. See
[LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
