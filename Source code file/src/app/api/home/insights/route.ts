import {
  ApiException,
  createBasicConfig,
  DataApi,
} from "@thoughtspot/rest-api-sdk";
import { NextResponse } from "next/server";

import { THOUGHTSPOT_MODEL_ID } from "@/config";
import { env } from "@/env";
import { getThoughtSpotSession } from "@/lib/thoughtspot-session";

export type HomeInsightsResponse = {
  avgMarginPct: number;
  avgDiscountPct: number;
  totalLineItems: number;
  pendingApprovalPct: number;
  pendingApprovalLineItems: number;
  regions: { region: string; marginPct: number; lineItems: number }[];
  regionsBehindPaceCount: number;
  waitingOnYou: {
    businessUnit: string;
    region: string;
    pendingLineItems: number;
    avgSpecialDiscountPct: number;
  }[];
};

type SearchContent = {
  column_names: string[];
  data_rows: unknown[];
};

function cellAt(
  content: SearchContent,
  row: unknown,
  columnMatch: (name: string) => boolean,
): unknown {
  const index = content.column_names.findIndex((name) =>
    columnMatch(name.toLowerCase()),
  );
  if (index === -1) return undefined;
  return Array.isArray(row)
    ? row[index]
    : (row as Record<string, unknown>)[content.column_names[index]];
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

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

  const search = (query_string: string, record_size = 100) =>
    dataApi.searchData({
      query_string,
      logical_table_identifier: THOUGHTSPOT_MODEL_ID,
      record_size,
    });

  try {
    const [overallRes, statusRes, regionRes, waitingRes] = await Promise.all([
      search("average [margin pct] average [discount pct] count [quote id]", 1),
      search("[quote status] count [quote id]", 50),
      search(
        "[region] average [margin pct] count [quote id]",
        50,
      ),
      search(
        "[quote status] = 'Pending Approval' [business unit] [region] count [quote id] average [special discount pct]",
        200,
      ),
    ]);

    const overall = overallRes.contents[0] as SearchContent | undefined;
    const overallRow = overall?.data_rows[0];
    const avgMarginPct = overall
      ? asNumber(cellAt(overall, overallRow, (n) => n.includes("margin")))
      : 0;
    const avgDiscountPct = overall
      ? asNumber(
          cellAt(overall, overallRow, (n) => n.includes("discount") && !n.includes("special")),
        )
      : 0;
    const totalLineItems = overall
      ? asNumber(cellAt(overall, overallRow, (n) => n.includes("quote")))
      : 0;

    const statusContent = statusRes.contents[0] as SearchContent | undefined;
    let pendingApprovalLineItems = 0;
    let statusTotal = 0;
    if (statusContent) {
      for (const row of statusContent.data_rows) {
        const status = asString(
          cellAt(statusContent, row, (n) => n.includes("quote status")),
        );
        const count = asNumber(
          cellAt(statusContent, row, (n) => n.includes("quote id")),
        );
        statusTotal += count;
        if (status === "Pending Approval") pendingApprovalLineItems += count;
      }
    }
    const pendingApprovalPct = statusTotal > 0 ? pendingApprovalLineItems / statusTotal : 0;

    const regionContent = regionRes.contents[0] as SearchContent | undefined;
    const regions: HomeInsightsResponse["regions"] = [];
    if (regionContent) {
      for (const row of regionContent.data_rows) {
        const region = asString(
          cellAt(regionContent, row, (n) => n.includes("region")),
        );
        const marginPct = asNumber(
          cellAt(regionContent, row, (n) => n.includes("margin")),
        );
        const lineItems = asNumber(
          cellAt(regionContent, row, (n) => n.includes("quote")),
        );
        if (region) regions.push({ region, marginPct, lineItems });
      }
    }
    regions.sort((a, b) => a.marginPct - b.marginPct);
    const regionsBehindPaceCount = regions.filter(
      (r) => r.marginPct < avgMarginPct,
    ).length;

    const waitingContent = waitingRes.contents[0] as SearchContent | undefined;
    const waitingOnYou: HomeInsightsResponse["waitingOnYou"] = [];
    if (waitingContent) {
      for (const row of waitingContent.data_rows) {
        waitingOnYou.push({
          businessUnit: asString(
            cellAt(waitingContent, row, (n) => n.includes("business unit")),
          ),
          region: asString(cellAt(waitingContent, row, (n) => n.includes("region"))),
          pendingLineItems: asNumber(
            cellAt(waitingContent, row, (n) => n.includes("quote")),
          ),
          avgSpecialDiscountPct: asNumber(
            cellAt(waitingContent, row, (n) => n.includes("special discount")),
          ),
        });
      }
    }
    waitingOnYou.sort((a, b) => b.pendingLineItems - a.pendingLineItems);

    const body: HomeInsightsResponse = {
      avgMarginPct,
      avgDiscountPct,
      totalLineItems,
      pendingApprovalPct,
      pendingApprovalLineItems,
      regions,
      regionsBehindPaceCount,
      waitingOnYou: waitingOnYou.slice(0, 5),
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("Failed to fetch home insights", error);
    const status = error instanceof ApiException ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to fetch home insights" },
      { status },
    );
  }
}
