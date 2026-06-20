import { describe, expect, it } from "vitest";
import {
  EXPECTED_HEADER,
  cleanAddressRow,
  parseAddressQuery,
  parseCsvLine,
  validateHeader,
} from "../src/core.ts";

describe("parseAddressQuery", () => {
  it("leaves a bare street name whole", () => {
    expect(parseAddressQuery("Njálsgata")).toEqual({
      street: "Njálsgata",
      number: null,
      letter: null,
    });
  });

  it("splits street + number + letter", () => {
    expect(parseAddressQuery("Njálsgata 8C")).toEqual({
      street: "Njálsgata",
      number: 8,
      letter: "c", // lowercased to match stored bokst
    });
  });

  it("splits street + number without a letter", () => {
    expect(parseAddressQuery("Gullengi 3")).toEqual({
      street: "Gullengi",
      number: 3,
      letter: null,
    });
  });

  it("handles multi-word street names", () => {
    expect(parseAddressQuery("Stóragerði 12")).toEqual({
      street: "Stóragerði",
      number: 12,
      letter: null,
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseAddressQuery("  Laugavegur  ")).toEqual({
      street: "Laugavegur",
      number: null,
      letter: null,
    });
  });
});

describe("parseCsvLine", () => {
  it("splits a plain comma row", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas inside quotes", () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsvLine('a,"he said ""hi""",b')).toEqual(["a", 'he said "hi"', "b"]);
  });

  it("preserves trailing empty fields", () => {
    expect(parseCsvLine("a,,")).toEqual(["a", "", ""]);
  });
});

describe("validateHeader", () => {
  it("passes the exact upstream header", () => {
    expect(validateHeader([...EXPECTED_HEADER])).toBeNull();
  });

  it("flags a wrong column count", () => {
    expect(validateHeader(["FID", "HNITNUM"])).toMatch(/column count/);
  });

  it("flags a renamed column", () => {
    const bad: string[] = [...EXPECTED_HEADER];
    bad[8] = "STREET_NAME";
    expect(validateHeader(bad)).toMatch(/column 8/);
  });
});

describe("cleanAddressRow", () => {
  const known = new Set(["201", "101"]);
  // Build a 29-field row with only the columns we read populated.
  function row(overrides: Record<number, string> = {}): string[] {
    const f = Array.from({ length: 29 }, () => "");
    f[1] = "10001414"; // HNITNUM
    f[2] = "1000"; // SVFNR
    f[3] = "01"; // BYGGD
    f[4] = "177597"; // LANDNR
    f[5] = "1005403"; // HEINUM
    f[7] = "201"; // POSTNR
    f[8] = "Bæjarlind"; // HEITI_NF
    f[9] = "Bæjarlind"; // HEITI_TGF
    f[10] = "8"; // HUSNR
    f[11] = ""; // BOKST
    f[23] = "64.09987002"; // N_HNIT_WGS84 (lat)
    f[24] = "-21.87914013"; // E_HNIT_WGS84 (lng)
    return Object.assign(f, overrides);
  }

  it("cleans a normal row", () => {
    expect(cleanAddressRow(row(), known)).toEqual({
      hnitnum: 10001414,
      heinum: 1005403,
      svfnr: 1000,
      byggd: 1, // "01" → 1
      landnr: 177597,
      postalCode: "201",
      streetNf: "Bæjarlind",
      streetTgf: "Bæjarlind",
      houseNumber: 8,
      houseLetter: null,
      serheiti: null,
      vidsk: null,
      lat: 64.09987002,
      lng: -21.87914013,
    });
  });

  it("lowercases the house letter", () => {
    expect(cleanAddressRow(row({ 11: "K" }), known)?.houseLetter).toBe("k");
  });

  it("converts Icelandic comma decimals to float", () => {
    const r = cleanAddressRow(row({ 23: "64,5", 24: "-21,5" }), known);
    expect(r?.lat).toBe(64.5);
    expect(r?.lng).toBe(-21.5);
  });

  it("skips rows whose postcode is not in the known set", () => {
    expect(cleanAddressRow(row({ 7: "999" }), known)).toBeNull();
  });

  it("skips rows with no street name", () => {
    expect(cleanAddressRow(row({ 8: "" }), known)).toBeNull();
  });

  it("skips rows with no hnitnum", () => {
    expect(cleanAddressRow(row({ 1: "" }), known)).toBeNull();
  });

  it("skips coordinates outside Iceland", () => {
    // London — well outside the 800 km radius.
    expect(cleanAddressRow(row({ 23: "51.5074", 24: "-0.1278" }), known)).toBeNull();
  });

  it("keeps a row with empty coordinates", () => {
    const r = cleanAddressRow(row({ 23: "", 24: "" }), known);
    expect(r?.lat).toBeNull();
    expect(r?.lng).toBeNull();
    expect(r?.hnitnum).toBe(10001414);
  });
});
