import { describe, expect, it } from "vitest";
import type { CleanAddress } from "../src/core.ts";
import { createAddressIndex } from "../src/lookup.ts";

function addr(
  p: Pick<CleanAddress, "hnitnum" | "streetNf" | "postalCode"> & Partial<CleanAddress>,
): CleanAddress {
  return {
    hnitnum: p.hnitnum,
    heinum: p.heinum ?? null,
    svfnr: p.svfnr ?? null,
    byggd: p.byggd ?? null,
    landnr: p.landnr ?? null,
    postalCode: p.postalCode,
    streetNf: p.streetNf,
    streetTgf: p.streetTgf ?? p.streetNf,
    houseNumber: p.houseNumber ?? null,
    houseLetter: p.houseLetter ?? null,
    serheiti: p.serheiti ?? null,
    vidsk: p.vidsk ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
  };
}

const FIXTURE: CleanAddress[] = [
  addr({ hnitnum: 1, streetNf: "Gullengi", postalCode: "112", houseNumber: 3 }),
  addr({ hnitnum: 2, streetNf: "Gullengi", postalCode: "112", houseNumber: 31 }),
  addr({ hnitnum: 3, streetNf: "Gullengi", postalCode: "112", houseNumber: 33 }),
  addr({ hnitnum: 4, streetNf: "Gullengi", postalCode: "112", houseNumber: 5 }),
  addr({ hnitnum: 5, streetNf: "Njálsgata", postalCode: "101", houseNumber: 8, houseLetter: "c" }),
  addr({
    hnitnum: 6,
    streetNf: "Öldugata",
    streetTgf: "Öldugötu",
    postalCode: "101",
    houseNumber: 4,
  }),
];

const index = createAddressIndex(FIXTURE);

describe("AddressIndex.search", () => {
  it("house-number prefix match: '3' returns 3, 31, 33 (not 5)", () => {
    const nums = index.search("Gullengi 3").map((r) => r.houseNumber);
    expect(nums).toEqual([3, 31, 33]);
  });

  it("bare street returns every address on it, ordered by number", () => {
    const nums = index.search("Gullengi").map((r) => r.houseNumber);
    expect(nums).toEqual([3, 5, 31, 33]);
  });

  it("matches the dative street form too", () => {
    const hits = index.search("Öldugötu 4");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.streetNf).toBe("Öldugata");
  });

  it("resolves city + a display line from the bundled postcode table", () => {
    const [hit] = index.search("Njálsgata 8");
    expect(hit?.city).toBe("Reykjavík");
    expect(hit?.display).toBe("Njálsgata 8c, 101 Reykjavík");
  });

  it("respects the letter when present", () => {
    expect(index.search("Njálsgata 8c")).toHaveLength(1);
    expect(index.search("Njálsgata 8b")).toHaveLength(0);
  });

  it("returns nothing for an empty query", () => {
    expect(index.search("")).toEqual([]);
  });
});

describe("AddressIndex.validate", () => {
  it("matches an exact (street, number, letter, postcode) tuple", () => {
    const r = index.validate({
      street: "Njálsgata",
      houseNumber: 8,
      houseLetter: "C", // case-insensitive
      postalCode: "101",
    });
    expect(r?.hnitnum).toBe(5);
  });

  it("returns null when the tuple does not match", () => {
    expect(
      index.validate({ street: "Njálsgata", houseNumber: 8, houseLetter: "b", postalCode: "101" }),
    ).toBeNull();
  });
});

describe("AddressIndex.lookupByHnitnum", () => {
  it("returns the row for a known id", () => {
    expect(index.lookupByHnitnum(5)?.streetNf).toBe("Njálsgata");
  });

  it("returns null for an unknown id", () => {
    expect(index.lookupByHnitnum(999)).toBeNull();
  });
});
