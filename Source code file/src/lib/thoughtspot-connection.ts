import { ConnectionsApi, createBasicConfig } from "@thoughtspot/rest-api-sdk";

import { SNOWFLAKE_UPLOAD_DATABASE, THOUGHTSPOT_SNOWFLAKE_CONNECTION_ID } from "@/config";
import { env } from "@/env";

export type ThoughtSpotConnectionRef = { id: string; name: string };

let cached: ThoughtSpotConnectionRef | undefined = THOUGHTSPOT_SNOWFLAKE_CONNECTION_ID
  ? { id: THOUGHTSPOT_SNOWFLAKE_CONNECTION_ID, name: THOUGHTSPOT_SNOWFLAKE_CONNECTION_ID }
  : undefined;

/**
 * Finds the ThoughtSpot connection object that has access to the
 * `HETARTHDEMOS` Snowflake database — needed so a newly-uploaded table can
 * be referenced from a TML worksheet (TML's `connection:` block needs the
 * connection's *name*, not its GUID). Not hardcoded in config.ts since it
 * isn't knowable ahead of time; discovered once via a metadata search and
 * cached in-process afterwards.
 *
 * Best-effort heuristic: searches all Snowflake connections and picks the
 * first whose `details` payload mentions the target database. If your
 * ThoughtSpot instance has multiple Snowflake connections and this picks
 * the wrong one, pin the correct GUID directly in
 * `THOUGHTSPOT_SNOWFLAKE_CONNECTION_ID` in src/config.ts to skip the
 * lookup entirely (the connection's own name is resolved automatically
 * either way).
 */
export async function findSnowflakeConnection(token: string): Promise<ThoughtSpotConnectionRef> {
  if (cached) return cached;

  const connectionsApi = new ConnectionsApi(
    createBasicConfig(env.NEXT_PUBLIC_THOUGHTSPOT_HOST, {
      additionalHeaders: { Authorization: `Bearer ${token}` },
    }),
  );

  const connections = await connectionsApi.searchConnection({
    data_warehouse_types: ["SNOWFLAKE"],
    include_details: true,
  });

  if (connections.length === 0) {
    throw new Error(
      "No Snowflake connection found in ThoughtSpot — create one pointing at HETARTHDEMOS first, or pin THOUGHTSPOT_SNOWFLAKE_CONNECTION_ID in src/config.ts.",
    );
  }

  const matches = connections.filter((c) =>
    JSON.stringify(c.details ?? "").toUpperCase().includes(SNOWFLAKE_UPLOAD_DATABASE),
  );
  console.info(
    `[thoughtspot-connection] ${connections.length} Snowflake connections, ${matches.length} mention ${SNOWFLAKE_UPLOAD_DATABASE}:`,
    matches.slice(0, 10).map((c) => `${c.name} (${c.id})`),
  );

  // Never fall back to an arbitrary connection — importing a table against
  // the wrong one just hangs until the gateway times out.
  const match = matches[0];
  if (!match) {
    throw new Error(
      `None of ${connections.length} Snowflake connections reference ${SNOWFLAKE_UPLOAD_DATABASE} — pin THOUGHTSPOT_SNOWFLAKE_CONNECTION_ID in src/config.ts.`,
    );
  }

  cached = { id: match.id, name: match.name };
  return cached;
}
