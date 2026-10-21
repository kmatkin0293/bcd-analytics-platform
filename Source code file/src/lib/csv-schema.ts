/**
 * Shared CSV column-type inference — used identically on the client (for
 * the preview table's type badges) and on the server (for the Snowflake
 * `CREATE TABLE` column types), so what the user sees in the preview is
 * exactly what gets created.
 */

export type CsvColumnType = "integer" | "decimal" | "date" | "boolean" | "string";

const BOOLEAN_VALUES = new Set([
  "true",
  "false",
  "yes",
  "no",
  "y",
  "n",
  "1",
  "0",
]);

const TRUE_VALUES = new Set(["true", "yes", "y", "1"]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?)?$/;
const US_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function looksLikeInteger(value: string): boolean {
  return /^-?\d+$/.test(value.trim());
}

function looksLikeDecimal(value: string): boolean {
  return /^-?\d*\.\d+$/.test(value.trim()) || /^-?\d+\.\d*$/.test(value.trim());
}

function looksLikeBoolean(value: string): boolean {
  return BOOLEAN_VALUES.has(value.trim().toLowerCase());
}

function looksLikeDate(value: string): boolean {
  const trimmed = value.trim();
  if (ISO_DATE_RE.test(trimmed) || US_DATE_RE.test(trimmed)) {
    return !Number.isNaN(Date.parse(trimmed));
  }
  return false;
}

/** Sampled column values → best-fit single type, falling back to string if the column is mixed or empty. */
export function inferColumnType(values: unknown[]): CsvColumnType {
  const sample = values
    .filter((v) => !isBlank(v))
    .map((v) => String(v))
    .slice(0, 200);

  if (sample.length === 0) return "string";

  if (sample.every(looksLikeBoolean)) return "boolean";
  if (sample.every(looksLikeInteger)) return "integer";
  if (sample.every((v) => looksLikeInteger(v) || looksLikeDecimal(v))) return "decimal";
  if (sample.every(looksLikeDate)) return "date";
  return "string";
}

/** Column name + inferred type for every column in a parsed CSV, by sampling each column's values. */
export function inferColumnTypes(
  columns: string[],
  rows: Record<string, unknown>[],
): { name: string; type: CsvColumnType }[] {
  return columns.map((name) => ({
    name,
    type: inferColumnType(rows.map((row) => row[name])),
  }));
}

/** Snowflake DDL type for a given inferred CSV column type. */
export function snowflakeTypeFor(type: CsvColumnType): string {
  switch (type) {
    case "integer":
      return "NUMBER(38,0)";
    case "decimal":
      return "FLOAT";
    case "date":
      return "TIMESTAMP_NTZ";
    case "boolean":
      return "BOOLEAN";
    default:
      return "VARCHAR(16777216)";
  }
}

/** Coerces a raw CSV cell to the JS value Snowflake's driver expects to bind for a given column type. */
export function coerceCellForBind(
  raw: unknown,
  type: CsvColumnType,
): string | number | boolean | null {
  if (isBlank(raw)) return null;
  const value = String(raw).trim();

  switch (type) {
    case "integer": {
      const n = Number.parseInt(value, 10);
      return Number.isNaN(n) ? null : n;
    }
    case "decimal": {
      const n = Number.parseFloat(value);
      return Number.isNaN(n) ? null : n;
    }
    case "boolean":
      return TRUE_VALUES.has(value.toLowerCase());
    case "date": {
      const ms = Date.parse(value);
      if (Number.isNaN(ms)) return null;
      // Snowflake's TIMESTAMP_NTZ bind expects an ISO string.
      return new Date(ms).toISOString();
    }
    default:
      return value;
  }
}

/** Uppercase, underscored, special-char-stripped identifier — safe as a Snowflake unquoted table/column name. */
export function sanitizeIdentifier(raw: string, maxLength = 255): string {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const withFallback = cleaned.length > 0 ? cleaned : "COLUMN";
  // Snowflake identifiers can't start with a digit when unquoted.
  const safe = /^[0-9]/.test(withFallback) ? `C_${withFallback}` : withFallback;
  return safe.slice(0, maxLength);
}

/** Sanitizes a list of column names, suffixing any collisions (e.g. two columns both sanitizing to "DATE") so every name stays unique. */
export function dedupeIdentifiers(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((raw) => {
    const base = sanitizeIdentifier(raw);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

/** Sanitized table name derived from a CSV filename, prefixed so ad-hoc uploads are easy to spot. */
export function sanitizeTableName(fileName: string, prefix: string): string {
  const base = fileName.replace(/\.csv$/i, "");
  const sanitized = sanitizeIdentifier(base, 255 - prefix.length);
  return `${prefix}${sanitized}`;
}
