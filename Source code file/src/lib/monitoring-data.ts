export type CountryRow = {
  name: string;
  value: number;
  isNull?: boolean;
};

/** A single row from the facility-country search, before alias/null handling. */
export type FacilityCountryRow = {
  name: string;
  value: number;
};

export type CountryIndex = {
  /** Named rows, sorted desc by study count. Excludes the "no country" bucket. */
  rows: CountryRow[];
  /** Normalized-name lookup covering dataset spellings, topojson aliases, and "nullcountry". */
  byNorm: Map<string, CountryRow>;
  /** Sum of `rows` values (mirrors the map's percent-of-total denominator). */
  total: number;
  /** Synthetic row for records with no facility country recorded. */
  nullRecord: CountryRow;
};

/** Normalizes a country name for fuzzy matching against the topojson feature set. */
export function normalizeCountryName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Maps topojson feature name spellings onto this model's "Country Name" values. */
const ALIAS: Record<string, string> = {
  // Topojson's "United States of America" / "Czechia" vs. this model's
  // "United States" / "Czech Republic". (US sub-national rows, e.g.
  // "United States - California", are collapsed into "United States"
  // server-side before this lookup ever runs.)
  unitedstatesofamerica: "United States",
  czechia: "Czech Republic",
};

/** Builds the lookup structures the map/rank/detail views need from a raw search response. */
export function buildCountryIndex(
  facilityCountryRows: FacilityCountryRow[],
  nullCount: number,
): CountryIndex {
  const rows = facilityCountryRows
    .filter((r) => r.name.trim().length > 0 && r.value > 0)
    .map((r) => ({ name: r.name.trim(), value: r.value }))
    .sort((a, b) => b.value - a.value);

  const total = rows.reduce((sum, row) => sum + row.value, 0);

  const nullRecord: CountryRow = {
    name: "No country recorded",
    value: nullCount,
    isNull: true,
  };

  const byNorm = new Map<string, CountryRow>();
  for (const row of rows) {
    byNorm.set(normalizeCountryName(row.name), row);
  }
  for (const [alias, name] of Object.entries(ALIAS)) {
    const row = byNorm.get(normalizeCountryName(name));
    if (row) byNorm.set(alias, row);
  }
  byNorm.set("nullcountry", nullRecord);

  return { rows, byNorm, total, nullRecord };
}

/** Breakpoints in USD, tuned to this dataset's roughly $0.1B–$18B per-country range. */
export const MONITORING_BREAKS = [1e9, 3e9, 6e9, 10e9, 15e9];
export const MONITORING_RAMP = [
  "#F3EEF9",
  "#D9C3EE",
  "#B894DC",
  "#8F5CC7",
  "#6B3AA8",
  "#4B2882",
];
export const MONITORING_STEP_LABELS = [
  "<$1B",
  "$1–3B",
  "$3–6B",
  "$6–10B",
  "$10–15B",
  "$15B+",
];
export const MONITORING_NODATA_COLOR = "#F0EAF7";

export function colorForCount(value: number | null | undefined): string {
  if (value == null) return MONITORING_NODATA_COLOR;
  const steps = MONITORING_BREAKS.filter((b) => value >= b).length;
  return MONITORING_RAMP[steps];
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** Compact USD formatting, e.g. "$18.4B" / "$940M" — for financial-exposure values. */
export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}
