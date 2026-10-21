import { ApiException, createBasicConfig, MetadataApi } from "@thoughtspot/rest-api-sdk";
import { NextResponse } from "next/server";

import { SNOWFLAKE_UPLOAD_TABLE_PREFIX } from "@/config";
import type { CsvColumnType } from "@/lib/csv-schema";
import { env } from "@/env";
import { findSnowflakeConnection } from "@/lib/thoughtspot-connection";
import {
  buildTableTml,
  buildModelTml,
  extractGuidFromTmlImportResponse,
} from "@/lib/thoughtspot-tml";
import { getThoughtSpotSession } from "@/lib/thoughtspot-session";

export type RegisterThoughtSpotRequestBody = {
  tableName: string;
  fileName: string;
  columns: { dbName: string; displayName: string; type: CsvColumnType }[];
};

export type RegisterThoughtSpotResponse = {
  success: true;
  worksheetGuid: string;
};

export type RegisterThoughtSpotErrorResponse = {
  success: false;
  error: string;
};

/** Pulls the human-readable failure out of a TML import response. */
function importErrorMessage(response: unknown): string {
  const status = (response as { response?: { status?: unknown } }[] | undefined)?.[0]
    ?.response?.status as { error_message?: string } | undefined;
  return status?.error_message ?? JSON.stringify(status ?? response);
}

/** GUIDs of every table/model with exactly this name (earlier failed attempts can leave duplicates). */
async function findGuidsByName(
  metadataApi: MetadataApi,
  name: string,
): Promise<string[]> {
  try {
    const results = await metadataApi.searchMetadata({
      metadata: [{ type: "LOGICAL_TABLE", identifier: name }],
    });
    return results
      .filter((r) => r.metadata_name === name)
      .map((r) => r.metadata_id)
      .filter((id): id is string => Boolean(id));
  } catch {
    return [];
  }
}

async function deleteGuids(metadataApi: MetadataApi, guids: string[]) {
  for (const identifier of guids) {
    try {
      await metadataApi.deleteMetadata({
        metadata: [{ identifier, type: "LOGICAL_TABLE" }],
      });
    } catch (error) {
      console.error("Failed to delete stale object", identifier, error);
    }
  }
}

/**
 * Finds the existing table/model GUIDs so imports can update in place. If the
 * table has duplicates (two objects mapping to one external table make every
 * import fail), delete the model that depends on them plus all the duplicates
 * and return nothing so both get recreated fresh.
 */
async function resolveExistingGuids(
  metadataApi: MetadataApi,
  tableName: string,
  modelName: string,
): Promise<{ tableGuid?: string; modelGuid?: string }> {
  const tableGuids = await findGuidsByName(metadataApi, tableName);
  const modelGuids = await findGuidsByName(metadataApi, modelName);
  if (tableGuids.length <= 1 && modelGuids.length <= 1) {
    return { tableGuid: tableGuids[0], modelGuid: modelGuids[0] };
  }
  await deleteGuids(metadataApi, modelGuids);
  await deleteGuids(metadataApi, tableGuids);
  return {};
}

export async function POST(request: Request) {
  const session = await getThoughtSpotSession();
  if (!session) {
    return NextResponse.json<RegisterThoughtSpotErrorResponse>(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let body: RegisterThoughtSpotRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<RegisterThoughtSpotErrorResponse>(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.tableName || !Array.isArray(body.columns) || body.columns.length === 0) {
    return NextResponse.json<RegisterThoughtSpotErrorResponse>(
      { success: false, error: "tableName and columns are required" },
      { status: 400 },
    );
  }

  const metadataApi = new MetadataApi(
    createBasicConfig(env.NEXT_PUBLIC_THOUGHTSPOT_HOST, {
      additionalHeaders: { Authorization: `Bearer ${session.token}` },
    }),
  );

  try {
    const connection = await findSnowflakeConnection(session.token);

    const modelName = `Ad-Hoc: ${body.tableName.replace(SNOWFLAKE_UPLOAD_TABLE_PREFIX, "")}`;
    const { tableGuid: existingTableGuid, modelGuid: existingModelGuid } =
      await resolveExistingGuids(metadataApi, body.tableName, modelName);

    const tableTml = buildTableTml({
      tableName: body.tableName,
      connectionId: connection.id,
      columns: body.columns,
      guid: existingTableGuid,
    });
    const tableResponse = await metadataApi.importMetadataTML({
      metadata_tmls: [tableTml],
      create_new: !existingTableGuid,
    });
    if (!extractGuidFromTmlImportResponse(tableResponse)) {
      console.error("Table TML import failed", JSON.stringify(tableResponse));
      return NextResponse.json<RegisterThoughtSpotErrorResponse>(
        {
          success: false,
          error: `Your data is safely in Snowflake, but the analytics engine couldn't register the table: ${importErrorMessage(tableResponse)}`,
        },
        { status: 502 },
      );
    }

    const tml = buildModelTml({
      tableName: body.tableName,
      modelName,
      description: `Uploaded CSV — ${body.fileName} — ${new Date().toISOString()}`,
      columns: body.columns,
      guid: existingModelGuid,
    });

    const response = await metadataApi.importMetadataTML({
      metadata_tmls: [tml],
      create_new: !existingModelGuid,
    });

    const worksheetGuid = extractGuidFromTmlImportResponse(response);
    if (!worksheetGuid) {
      console.error("Model TML import failed", JSON.stringify(response));
      return NextResponse.json<RegisterThoughtSpotErrorResponse>(
        {
          success: false,
          error: `Your data is safely in Snowflake, but the analytics engine couldn't build a model over it: ${importErrorMessage(response)}`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json<RegisterThoughtSpotResponse>({
      success: true,
      worksheetGuid,
    });
  } catch (error) {
    console.error("Failed to register table with the analytics engine", error);
    const detail =
      error instanceof ApiException
        ? `(${error.code}) ${error.body ? JSON.stringify(error.body) : error.message}`
        : error instanceof Error
          ? error.message
          : "Unknown error";
    return NextResponse.json<RegisterThoughtSpotErrorResponse>(
      {
        success: false,
        error: `Your data is safely in Snowflake, but making it askable failed: ${detail}. It may need to be added to the connection's table list first.`,
      },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getThoughtSpotSession();
  if (!session) {
    return NextResponse.json<RegisterThoughtSpotErrorResponse>(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let body: { worksheetGuid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<RegisterThoughtSpotErrorResponse>(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.worksheetGuid) {
    return NextResponse.json<RegisterThoughtSpotErrorResponse>(
      { success: false, error: "worksheetGuid is required" },
      { status: 400 },
    );
  }

  const metadataApi = new MetadataApi(
    createBasicConfig(env.NEXT_PUBLIC_THOUGHTSPOT_HOST, {
      additionalHeaders: { Authorization: `Bearer ${session.token}` },
    }),
  );

  try {
    await metadataApi.deleteMetadata({
      metadata: [{ identifier: body.worksheetGuid, type: "LOGICAL_TABLE" }],
    });
  } catch (error) {
    console.error("Failed to delete worksheet", error);
    return NextResponse.json<RegisterThoughtSpotErrorResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete worksheet" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
