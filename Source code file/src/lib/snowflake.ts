import snowflake from "snowflake-sdk";

import { SNOWFLAKE_UPLOAD_DATABASE, SNOWFLAKE_UPLOAD_SCHEMA } from "@/config";
import { env } from "@/env";

/** True once all five Snowflake env vars are present — gates the upload routes with a clean error instead of a crash. */
export function isSnowflakeConfigured(): boolean {
  return Boolean(
    env.SNOWFLAKE_ACCOUNT &&
      env.SNOWFLAKE_USER &&
      env.SNOWFLAKE_PASSWORD &&
      env.SNOWFLAKE_WAREHOUSE,
  );
}

function createConnection(): snowflake.Connection {
  if (!isSnowflakeConfigured()) {
    throw new Error(
      "Snowflake isn't configured — set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD, SNOWFLAKE_WAREHOUSE (and optionally SNOWFLAKE_ROLE) in .env.local.",
    );
  }
  return snowflake.createConnection({
    account: env.SNOWFLAKE_ACCOUNT as string,
    username: env.SNOWFLAKE_USER as string,
    password: env.SNOWFLAKE_PASSWORD as string,
    role: env.SNOWFLAKE_ROLE,
    warehouse: env.SNOWFLAKE_WAREHOUSE as string,
    database: SNOWFLAKE_UPLOAD_DATABASE,
    schema: SNOWFLAKE_UPLOAD_SCHEMA,
  });
}

function connect(connection: snowflake.Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function destroy(connection: snowflake.Connection): Promise<void> {
  return new Promise((resolve) => {
    connection.destroy(() => resolve());
  });
}

/** Runs a single parameterized statement and resolves with its result rows. */
export function execute<T = unknown>(
  connection: snowflake.Connection,
  sqlText: string,
  binds?: snowflake.Binds,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) reject(err);
        else resolve((rows ?? []) as T[]);
      },
    });
  });
}

/**
 * Opens a connection, runs `fn` with it, and always tears the connection
 * down afterwards — the one entry point every upload-csv route should use
 * instead of managing connect/destroy themselves.
 */
export async function withSnowflakeConnection<T>(
  fn: (connection: snowflake.Connection, run: typeof execute) => Promise<T>,
): Promise<T> {
  const connection = createConnection();
  await connect(connection);
  try {
    return await fn(connection, execute);
  } finally {
    await destroy(connection);
  }
}

/** Quotes a Snowflake double-quoted identifier (table/column name), escaping any embedded quotes. */
export function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
