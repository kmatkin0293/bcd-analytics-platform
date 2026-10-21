import type { Binds } from "snowflake-sdk";
import Papa from "papaparse";
import { NextResponse } from "next/server";

import {
  CSV_UPLOAD_MAX_BYTES,
  SNOWFLAKE_UPLOAD_DATABASE,
  SNOWFLAKE_UPLOAD_SCHEMA,
  SNOWFLAKE_UPLOAD_TABLE_PREFIX,
} from "@/config";
import {
  coerceCellForBind,
  dedupeIdentifiers,
  inferColumnTypes,
  sanitizeIdentifier,
  sanitizeTableName,
  snowflakeTypeFor,
} from "@/lib/csv-schema";
import { isSnowflakeConfigured, quoteIdent, withSnowflakeConnection } from "@/lib/snowflake";
import { getThoughtSpotSession } from "@/lib/thoughtspot-session";

export type UploadCsvResponse = {
  success: true;
  tableName: string;
  database: string;
  schema: string;
  rowCount: number;
  columns: string[];
  fileName: string;
};

export type UploadCsvErrorResponse = {
  success: false;
  error: string;
};

const INSERT_BATCH_SIZE = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function POST(request: Request) {
  const session = await getThoughtSpotSession();
  if (!session) {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  if (!isSnowflakeConfigured()) {
    return NextResponse.json<UploadCsvErrorResponse>(
      {
        success: false,
        error:
          "Snowflake isn't configured on this server. Set SNOWFLAKE_ACCOUNT / SNOWFLAKE_USER / SNOWFLAKE_PASSWORD / SNOWFLAKE_WAREHOUSE in .env.local.",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const requestedTableName = String(formData.get("tableName") ?? "");
  const overwrite = formData.get("overwrite") !== "false";

  if (!(file instanceof Blob)) {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "Missing CSV file" },
      { status: 400 },
    );
  }

  if (file.size > CSV_UPLOAD_MAX_BYTES) {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "File exceeds the 50 MB limit" },
      { status: 413 },
    );
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: `Couldn't parse CSV: ${parsed.errors[0]?.message}` },
      { status: 400 },
    );
  }

  const originalColumns = parsed.meta.fields ?? [];
  if (originalColumns.length === 0) {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "CSV has no columns" },
      { status: 400 },
    );
  }

  const rows = parsed.data;
  const sanitizedColumns = dedupeIdentifiers(originalColumns);
  const columnTypes = inferColumnTypes(originalColumns, rows);

  const fileName =
    file instanceof File ? file.name : `${requestedTableName || "upload"}.csv`;
  const tableName = requestedTableName
    ? sanitizeIdentifier(requestedTableName).startsWith(SNOWFLAKE_UPLOAD_TABLE_PREFIX)
      ? sanitizeIdentifier(requestedTableName)
      : `${SNOWFLAKE_UPLOAD_TABLE_PREFIX}${sanitizeIdentifier(requestedTableName)}`
    : sanitizeTableName(fileName, SNOWFLAKE_UPLOAD_TABLE_PREFIX);

  const columnDdl = sanitizedColumns
    .map((name, i) => `${quoteIdent(name)} ${snowflakeTypeFor(columnTypes[i].type)}`)
    .join(", ");

  const createStatement = overwrite
    ? `CREATE OR REPLACE TABLE ${quoteIdent(tableName)} (${columnDdl})`
    : `CREATE TABLE IF NOT EXISTS ${quoteIdent(tableName)} (${columnDdl})`;

  const insertColumns = sanitizedColumns.map(quoteIdent).join(", ");
  const placeholders = sanitizedColumns.map(() => "?").join(", ");
  const insertStatement = `INSERT INTO ${quoteIdent(tableName)} (${insertColumns}) VALUES (${placeholders})`;

  const binds: (string | number | boolean | null)[][] = rows.map((row) =>
    originalColumns.map((col, i) => coerceCellForBind(row[col], columnTypes[i].type)),
  );

  try {
    await withSnowflakeConnection(async (connection, run) => {
      await run(connection, `USE DATABASE ${quoteIdent(SNOWFLAKE_UPLOAD_DATABASE)}`);
      await run(connection, `USE SCHEMA ${quoteIdent(SNOWFLAKE_UPLOAD_SCHEMA)}`);
      await run(connection, createStatement);

      for (const batch of chunk(binds, INSERT_BATCH_SIZE)) {
        await run(connection, insertStatement, batch as unknown as Binds);
      }
    });
  } catch (error) {
    console.error("Snowflake ingestion failed", error);
    return NextResponse.json<UploadCsvErrorResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Snowflake ingestion failed",
      },
      { status: 502 },
    );
  }

  return NextResponse.json<UploadCsvResponse>({
    success: true,
    tableName,
    database: SNOWFLAKE_UPLOAD_DATABASE,
    schema: SNOWFLAKE_UPLOAD_SCHEMA,
    rowCount: rows.length,
    columns: sanitizedColumns,
    fileName,
  });
}

/**
 * Cleanup for a previously uploaded table. Defaults to a *safe* unregister
 * (drop the ThoughtSpot worksheet only, leave the Snowflake table intact) —
 * pass `dropSnowflakeTable: true` to also actually drop the table.
 */
export async function DELETE(request: Request) {
  const session = await getThoughtSpotSession();
  if (!session) {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let body: { tableName?: string; dropSnowflakeTable?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.tableName) {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "tableName is required" },
      { status: 400 },
    );
  }

  if (!body.dropSnowflakeTable) {
    // Safe default: nothing to do on the Snowflake side at all — the
    // worksheet un-registration (if any) happens via the
    // register-thoughtspot route's DELETE handler, called separately.
    return NextResponse.json({ success: true });
  }

  if (!isSnowflakeConfigured()) {
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: "Snowflake isn't configured on this server" },
      { status: 503 },
    );
  }

  const tableName = sanitizeIdentifier(body.tableName);
  try {
    await withSnowflakeConnection(async (connection, run) => {
      await run(connection, `USE DATABASE ${quoteIdent(SNOWFLAKE_UPLOAD_DATABASE)}`);
      await run(connection, `USE SCHEMA ${quoteIdent(SNOWFLAKE_UPLOAD_SCHEMA)}`);
      await run(connection, `DROP TABLE IF EXISTS ${quoteIdent(tableName)}`);
    });
  } catch (error) {
    console.error("Failed to drop Snowflake table", error);
    return NextResponse.json<UploadCsvErrorResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to drop table" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
