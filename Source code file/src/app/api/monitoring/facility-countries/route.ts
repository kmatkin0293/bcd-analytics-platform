import {
  ApiException,
  createBasicConfig,
  DataApi,
} from "@thoughtspot/rest-api-sdk";
import { NextResponse } from "next/server";

import { THOUGHTSPOT_PRIVACY_MODEL_ID } from "@/config";
import { env } from "@/env";
import { getThoughtSpotSession } from "@/lib/thoughtspot-session";

/**
 * Total estimated financial exposure by country, last 12 months. Matches
 * the Data Privacy & Compliance liveboard's own country-level breakdown so
 * the map and the embedded liveboard stay in sync.
 */
const QUERY_STRING =
  "[Country Name] [Estimated Financial Exposure] [Date].'last 12 months'";

/** Comfortably above the country-name cardinality this model will ever have. */
const RECORD_SIZE = 5000;

export type FacilityCountriesResponse = {
  rows: { name: string; value: number }[];
  nullCount: number;
};

export async function GET() {
  const session = await getThoughtSpotSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dataApi = new DataApi(
    createBasicConfig(env.NEXT_PUBLIC_THOUGHTSPOT_HOST, {
      additionalHeaders: { Authorization: `Bearer ${session.token}` },
    }),
  );

  try {
    const response = await dataApi.searchData({
      query_string: QUERY_STRING,
      logical_table_identifier: THOUGHTSPOT_PRIVACY_MODEL_ID,
      record_size: RECORD_SIZE,
    });

    const content = response.contents[0];
    if (!content) {
      return NextResponse.json({ rows: [], nullCount: 0 });
    }

    const countryIdx = content.column_names.findIndex(
      (name) => name.toLowerCase() === "country name",
    );
    const exposureIdx = content.column_names.findIndex((name) =>
      name.toLowerCase().includes("financial exposure"),
    );
    if (countryIdx === -1 || exposureIdx === -1) {
      console.error(
        "Unexpected searchData columns for country exposure",
        content.column_names,
      );
      return NextResponse.json(
        { error: "Unexpected search response shape" },
        { status: 502 },
      );
    }

    const cellAt = (row: unknown, index: number): unknown =>
      Array.isArray(row)
        ? row[index]
        : (row as Record<string, unknown>)[content.column_names[index]];

    const byName = new Map<string, number>();
    let nullCount = 0;
    for (const row of content.data_rows) {
      const rawName = cellAt(row, countryIdx);
      const rawValue = cellAt(row, exposureIdx);
      const value =
        typeof rawValue === "number" ? rawValue : Number(rawValue) || 0;
      // This model reports some countries at sub-national grain (e.g.
      // "United States - California", "Canada - Quebec") — collapse those
      // into their parent country so the world map (keyed by country only)
      // aggregates them correctly instead of treating each as "no data".
      const name =
        typeof rawName === "string" ? rawName.trim().split(" - ")[0] : "";

      if (!name) {
        nullCount += value;
        continue;
      }
      byName.set(name, (byName.get(name) ?? 0) + value);
    }

    const rows = Array.from(byName, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    );

    const body: FacilityCountriesResponse = { rows, nullCount };
    return NextResponse.json(body);
  } catch (error) {
    console.error("Failed to search facility-country data", error);
    const status = error instanceof ApiException ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to fetch facility-country data" },
      { status },
    );
  }
}
