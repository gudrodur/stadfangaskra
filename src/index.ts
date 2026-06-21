// iceaddr-ts — Icelandic address registry (Staðfangaskrá) lookup for
// TypeScript / Cloudflare Workers / Node. A zero-dependency, edge-native port of
// the data layer of Sveinbjörn Þórðarson's `iceaddr`
// (https://github.com/sveinbjornt/iceaddr).
//
// - core:      parse + clean + validate the upstream CSV; parse search queries
// - fetch:     stream the registry live from HMS (no data is bundled here)
// - lookup:    in-memory search / validate / hnitnum lookup over the records
// - postcodes: the bundled postcode table (also at the `iceaddr-ts/postcodes`
//              subpath if you only want the postcode data)

export * from "./core.ts";
export * from "./fetch.ts";
export * from "./lookup.ts";
export { type Postcode, POSTCODES, postcodeLookup, knownPostcodes } from "./postcodes.ts";
