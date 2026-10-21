import type { CsvColumnType } from "@/lib/csv-schema";
import { SNOWFLAKE_UPLOAD_DATABASE, SNOWFLAKE_UPLOAD_SCHEMA } from "@/config";

/** Double-quoted YAML scalar, with internal `"` and `\` escaped. */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function worksheetColumnType(type: CsvColumnType): "ATTRIBUTE" | "MEASURE" {
  return type === "integer" || type === "decimal" ? "MEASURE" : "ATTRIBUTE";
}

export type TmlColumn = {
  /** Physical Snowflake column name (sanitized). */
  dbName: string;
  /** Original CSV header, shown to users in the worksheet. */
  displayName: string;
  type: CsvColumnType;
};

function tableDataType(type: CsvColumnType): string {
  switch (type) {
    case "integer":
      return "INT64";
    case "decimal":
      return "DOUBLE";
    case "boolean":
      return "BOOL";
    case "date":
      return "DATE_TIME";
    default:
      return "VARCHAR";
  }
}

/**
 * TML for the ThoughtSpot *table* object backed by the uploaded Snowflake
 * table. A worksheet can only reference table objects that already exist in
 * ThoughtSpot, so this must be imported before `buildWorksheetTml`.
 */
export function buildTableTml({
  tableName,
  connectionId,
  columns,
  guid,
}: {
  tableName: string;
  connectionId: string;
  columns: TmlColumn[];
  /** Existing object GUID — makes the import an in-place update. */
  guid?: string;
}): string {
  const columnLines = columns
    .map(
      (col) => `  - name: ${yamlString(col.dbName)}
    db_column_name: ${yamlString(col.dbName)}
    properties:
      column_type: ${worksheetColumnType(col.type)}
      index_type: DONT_INDEX
    db_column_properties:
      data_type: ${tableDataType(col.type)}`,
    )
    .join("\n");

  return `${guid ? `guid: ${guid}\n` : ""}table:
  name: ${yamlString(tableName)}
  db: ${yamlString(SNOWFLAKE_UPLOAD_DATABASE)}
  schema: ${yamlString(SNOWFLAKE_UPLOAD_SCHEMA)}
  db_table: ${yamlString(tableName)}
  connection:
    fqn: ${yamlString(connectionId)}
  columns:
${columnLines}
`;
}

/**
 * Hand-built TML YAML for a Model over a single already-imported table
 * object (see `buildTableTml`). Deliberately minimal — one table, one
 * column per CSV column, no joins. Models (not worksheets) are what Spotter
 * answers questions against, and Spotter is switched on for each one
 * (`is_spotter_enabled`) so no admin step is needed. Numeric columns default to SUM aggregation.
 */
export function buildModelTml({
  tableName,
  modelName,
  description,
  columns,
  guid,
}: {
  tableName: string;
  modelName: string;
  description: string;
  columns: TmlColumn[];
  guid?: string;
}): string {
  const columnLines = columns
    .map((col) => {
      const isMeasure = worksheetColumnType(col.type) === "MEASURE";
      return `  - name: ${yamlString(col.displayName)}
    column_id: ${yamlString(`${tableName}::${col.dbName}`)}
    properties:
      column_type: ${isMeasure ? "MEASURE" : "ATTRIBUTE"}${isMeasure ? "\n      aggregation: SUM" : ""}
      index_type: DONT_INDEX`;
    })
    .join("\n");

  return `${guid ? `guid: ${guid}\n` : ""}model:
  name: ${yamlString(modelName)}
  description: ${yamlString(description)}
  model_tables:
  - name: ${yamlString(tableName)}
  properties:
    spotter_config:
      is_spotter_enabled: true
  columns:
${columnLines}
`;
}

/**
 * Best-effort extraction of the created object's GUID from ThoughtSpot's
 * TML-import response — the SDK types this as `any[]`, and the exact
 * header shape has shifted across versions, so this tries every path seen
 * in the docs rather than assuming one.
 */
export function extractGuidFromTmlImportResponse(response: unknown): string | null {
  if (!Array.isArray(response) || response.length === 0) return null;
  const entry = response[0] as Record<string, unknown> | undefined;
  if (!entry) return null;

  const responseObj = entry.response as Record<string, unknown> | undefined;
  const header =
    (responseObj?.header as Record<string, unknown> | undefined) ??
    (entry.header as Record<string, unknown> | undefined);

  const guid = header?.id_guid ?? header?.id ?? entry.guid ?? entry.id;
  return typeof guid === "string" ? guid : null;
}
