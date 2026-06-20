// Staðfangaskrá (Icelandic address registry) CSV parsing + cleaning — the pure,
// zero-dependency core. Mirrors the cleaning + query semantics of Sveinbjörn
// Þórðarson's Python `iceaddr` build pipeline (https://github.com/sveinbjornt/iceaddr)
// so address data is filtered identically. Runs in Node and in Workers (V8); no
// I/O, no network, no dependencies.

// Exact upstream CSV header (29 columns) — validated before any load so an
// upstream schema change aborts the refresh instead of silently corrupting.
export const EXPECTED_HEADER = [
  "FID",
  "HNITNUM",
  "SVFNR",
  "BYGGD",
  "LANDNR",
  "HEINUM",
  "MATSNR",
  "POSTNR",
  "HEITI_NF",
  "HEITI_TGF",
  "HUSNR",
  "BOKST",
  "VIDSK",
  "SERHEITI",
  "DAGS_INN",
  "DAGS_LEIDR",
  "GAGNA_EIGN",
  "TEGHNIT",
  "YFIRFARID",
  "YFIRF_HEITI",
  "ATH",
  "NAKV_XY",
  "HNIT",
  "N_HNIT_WGS84",
  "E_HNIT_WGS84",
  "NOTNR",
  "LM_HEIMILISFANG",
  "VEF_BIRTING",
  "HUSMERKING",
] as const;

// Zero-based column indexes for the 13 fields we keep (iceaddr's subset).
const COL = {
  HNITNUM: 1,
  SVFNR: 2,
  BYGGD: 3,
  LANDNR: 4,
  HEINUM: 5,
  POSTNR: 7,
  HEITI_NF: 8,
  HEITI_TGF: 9,
  HUSNR: 10,
  BOKST: 11,
  VIDSK: 12,
  SERHEITI: 13,
  N_HNIT_WGS84: 23,
  E_HNIT_WGS84: 24,
} as const;

// Iceland bounding check — iceaddr skips any point further than 800 km from
// the country's geographic centre. Guards against stray/garbage coordinates.
const ICELAND_CENTER = { lat: 64.9957, lng: -18.5739 };
const MAX_DISTANCE_KM = 800;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Quote-aware CSV line splitter (RFC 4180 subset: ""→" inside quotes). The
// HMS export is unquoted in practice, but street/info fields could contain a
// comma, so we parse defensively rather than `line.split(",")`.
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export interface CleanAddress {
  /** Coordinate-point identifier (the geo point). NOT unique per address — one
   *  address (`heinum`) can have several points. Use `heinum` to identify the
   *  address itself. */
  hnitnum: number;
  /** Address identifier (staðfanga-/heitinúmer) — the stable id of the address
   *  itself, used to join with HMS and other public datasets. Distinct from the
   *  coordinate-point `hnitnum`. */
  heinum: number | null;
  svfnr: number | null;
  byggd: number | null;
  landnr: number | null;
  postalCode: string;
  streetNf: string;
  streetTgf: string | null;
  houseNumber: number | null;
  houseLetter: string | null;
  serheiti: string | null;
  vidsk: string | null;
  lat: number | null;
  lng: number | null;
}

function intOrNull(raw: string | undefined): number | null {
  const v = (raw ?? "").trim();
  if (v === "") return null;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

// Icelandic decimals use a comma; iceaddr converts to dot before float parse.
function floatOrNull(raw: string | undefined): number | null {
  const v = (raw ?? "").trim().replace(",", ".");
  if (v === "") return null;
  const n = Number.parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function textOrNull(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  return v === "" ? null : v;
}

// Clean one CSV data row into a typed record, or null to skip it — applying
// the same filters iceaddr does: drop rows with no stable id, no street, a
// postcode outside the known set, or coordinates outside Iceland.
export function cleanAddressRow(
  fields: string[],
  knownPostcodes: Set<string>,
): CleanAddress | null {
  const hnitnum = intOrNull(fields[COL.HNITNUM]);
  if (hnitnum === null) return null;

  const postalCode = (fields[COL.POSTNR] ?? "").trim();
  if (!knownPostcodes.has(postalCode)) return null;

  const streetNf = (fields[COL.HEITI_NF] ?? "").trim();
  if (streetNf === "") return null;

  const lat = floatOrNull(fields[COL.N_HNIT_WGS84]);
  const lng = floatOrNull(fields[COL.E_HNIT_WGS84]);
  if (lat !== null && lng !== null) {
    if (haversineKm(ICELAND_CENTER, { lat, lng }) > MAX_DISTANCE_KM) return null;
  }

  return {
    hnitnum,
    heinum: intOrNull(fields[COL.HEINUM]),
    svfnr: intOrNull(fields[COL.SVFNR]),
    byggd: intOrNull(fields[COL.BYGGD]),
    landnr: intOrNull(fields[COL.LANDNR]),
    postalCode,
    streetNf,
    streetTgf: textOrNull(fields[COL.HEITI_TGF]),
    houseNumber: intOrNull(fields[COL.HUSNR]),
    houseLetter: textOrNull(fields[COL.BOKST])?.toLowerCase() ?? null,
    serheiti: textOrNull(fields[COL.SERHEITI]),
    vidsk: textOrNull(fields[COL.VIDSK]),
    lat,
    lng,
  };
}

// Validate the parsed header against the expected 29 columns. Returns the
// first mismatch (or null when OK) so the refresh job can abort + alert.
export function validateHeader(headerFields: string[]): string | null {
  if (headerFields.length !== EXPECTED_HEADER.length) {
    return `column count ${headerFields.length} != expected ${EXPECTED_HEADER.length}`;
  }
  for (let i = 0; i < EXPECTED_HEADER.length; i++) {
    if (headerFields[i]?.trim() !== EXPECTED_HEADER[i]) {
      return `column ${i} is "${headerFields[i]}" != expected "${EXPECTED_HEADER[i]}"`;
    }
  }
  return null;
}

export interface ParsedAddressQuery {
  street: string;
  number: number | null;
  letter: string | null;
}

// Split "Njálsgata 8C" → { street: "Njálsgata", number: 8, letter: "c" }, but
// leave "Njálsgata" whole. Mirrors iceaddr's autocomplete query parser regex
// so number-bearing searches keep working.
export function parseAddressQuery(query: string): ParsedAddressQuery {
  const trimmed = query.trim();
  const m = /^([^\d]+?)(?:\s+(\d+)([a-zA-Z]?))?$/.exec(trimmed);
  if (!m) {
    return { street: trimmed, number: null, letter: null };
  }
  const street = (m[1] ?? "").trim();
  const number = m[2] ? Number.parseInt(m[2], 10) : null;
  const letter = m[3] ? m[3].toLowerCase() : null;
  return { street, number, letter };
}
