import { env } from "@/env";

/**
 * The login page is a demo placeholder — the username/password fields are
 * decorative (any value, e.g. "TS123" / "TS123", is accepted client-side).
 * Every sign-in is actually authenticated server-side against this single
 * real ThoughtSpot user via trusted auth, so Vera and the embedded
 * liveboards always get a fully authenticated session regardless of what
 * was typed into the form.
 */
export const THOUGHTSPOT_DEMO_USERNAME = "Hetarth.Chokshi@thoughtspot.com";

/**
 * Central place for ThoughtSpot content/object IDs so they never end up
 * hardcoded inside a component. Values are sourced from env vars where
 * available; the rest (viz GUIDs, column GUIDs, and data-model GUIDs that
 * don't have their own env var) are hardcoded here directly.
 *
 * Three liveboards power this app, each on its own underlying data model:
 *  1. "Global Pricing & Quotation Analytics" (/analytics)      — model: SE Pricing and Quotation
 *  2. "Global Data Privacy & Compliance Command Center" (/monitoring) — model: SE Governance model
 *  3. "SE Data Governance, Compliance & M&A" (/governance)     — model: SE - Regulations
 */

// --- Liveboards -------------------------------------------------------

/** "Global Pricing & Quotation Analytics" — embedded on /analytics. */
export const THOUGHTSPOT_LIVEBOARD_ID =
  env.NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS;

/** "Global Data Privacy & Compliance Command Center" — embedded on /monitoring once a country is selected. */
export const THOUGHTSPOT_LIVEBOARD_COUNTRY_STATS_ID =
  env.NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS;

/** "SE Data Governance, Compliance & M&A" — embedded on /governance. */
export const THOUGHTSPOT_LIVEBOARD_GOVERNANCE_ID =
  env.NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS;

// --- Data models --------------------------------------------------------

/** "SE Pricing and Quotation" — Vera's scoped data source, and the model behind /analytics' filters. */
export const THOUGHTSPOT_MODEL_ID =
  env.NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS;

/**
 * "SE Governance model" — backs the Data Privacy & Compliance liveboard.
 * Queried directly (via searchData) to drive the /monitoring world map, and
 * its column GUIDs power that page's filter buttons. Not exposed via env
 * since it isn't needed client-side.
 */
export const THOUGHTSPOT_PRIVACY_MODEL_ID =
  "c2d05ef0-b854-4e85-93c3-95049394ab39";

// --- Column GUIDs for the /analytics filter buttons (Pricing & Quotation model) ---
export const THOUGHTSPOT_PRICING_COLUMN_IDS = {
  calendarDate: "901397c5-3e90-4378-9c70-b5f2ae733efe",
  region: "df3aa85f-0fa0-4c97-9b89-59057cfcb243",
  businessUnit: "cd2b49da-ecf6-4420-9a69-39a256daae54",
  productCategory: "51c88d59-c3ca-44cc-ac12-f5a9eee8f726",
  customerSegment: "f77eea49-f059-4429-8149-4a711d047ef6",
  channel: "622bb69d-478a-4859-baf3-31ee9951258c",
  quoteStatus: "9e0047dd-c3e2-4dce-993f-ea94c85d6b03",
};

// --- Column GUIDs for the /monitoring filter buttons (SE Governance model) ---
export const THOUGHTSPOT_PRIVACY_COLUMN_IDS = {
  date: "430b57be-2988-43c1-b700-9046187144f8",
  region: "c1d8a8b9-9f16-42ba-8324-86e808c49d48",
  regulationName: "df0ae22d-c018-4845-a2ed-c9be6952bcd0",
  riskLevel: "35e111de-a5ca-4bdd-9ec8-22cdd41abdaf",
  complianceStatus: "687d5dd5-8cea-4371-bb51-4890369b3f8e",
};

// --- Column GUIDs for the /governance filter buttons (SE - Regulations model) ---
export const THOUGHTSPOT_GOVERNANCE_COLUMN_IDS = {
  countryName: "043470b6-e42b-428d-9b81-caf6bd5b27bf",
  region: "2fad6723-7a90-438d-83a3-ba85a385f973",
  date: "3a25fa27-db7b-437f-a179-a0c85d7a0b60",
  complianceStatus: "d0dc7c7b-778a-46eb-8d4a-32f823eac3cd",
  businessUnit: "cdde2067-9f52-4d3d-a7f1-2fa98d63535c",
  riskLevel: "337f9604-2cb9-4cfc-b384-83fed483aa2a",
  dataDomain: "47f0329e-17e4-474a-b423-933bc60591fd",
};

/** Custom embed stylesheet, served from GitHub via the jsDelivr CDN. */
export const THOUGHTSPOT_CUSTOM_CSS_URL =
  "https://cdn.jsdelivr.net/gh/jhegele-ts/industry-demos-assets@main/pharma-clinical-trials/styles.css";

/**
 * Viz GUID for "Global Compliance Trend (12 Months)" on the Data Privacy &
 * Compliance liveboard — a monthly average-completion-percentage trend.
 * Clicking a point on it (via EmbedEvent.VizPointClick on /monitoring)
 * surfaces the "Open Case" flow.
 */
export const THOUGHTSPOT_COMPLETION_RATE_TREND_VIZ_ID =
  "a5936c37-0cd4-4f49-8784-308949984af3";

// --- Sidebar AI agents (Premium-only) -----------------------------------

/**
 * Standalone ThoughtSpot Agentspot agents, launched in their own popup
 * window from the sidebar's "Agents" section. Premium-only — Basic shows
 * these locked with an upgrade prompt instead of opening anything.
 */
export const THOUGHTSPOT_AGENTS = [
  {
    id: "advisory",
    label: "Advisory Agent",
    url: "https://se-thoughtspot-cloud-primary.agentspot.thoughtspot.cloud/agent/01a0e788-5bd5-71ff-b329-138ff7cf4fa7",
  },
  {
    id: "tax",
    label: "Tax Agent",
    url: "https://se-thoughtspot-cloud-primary.agentspot.thoughtspot.cloud/agent/01a0af8f-275f-767d-8fd7-09499af53ad8",
  },
  {
    id: "audit",
    label: "Audit Agent",
    url: "https://se-thoughtspot-cloud-primary.agentspot.thoughtspot.cloud/agent/01a03ee9-74a7-702b-9ad4-cecbd3bbd3e6",
  },
] as const;

// --- Ad-hoc CSV upload → Snowflake → analytics engine ------------------

/** Fixed destination database/schema every CSV upload lands in. */
export const SNOWFLAKE_UPLOAD_DATABASE = "HETARTHDEMOS";
export const SNOWFLAKE_UPLOAD_SCHEMA = "GT_CSV";

/** Sanitized table names are prefixed with this so ad-hoc uploads are easy to spot in Snowflake. */
export const SNOWFLAKE_UPLOAD_TABLE_PREFIX = "ADHOC_";

/** Hard cap enforced both client-side (before upload starts) and server-side (defense in depth). */
export const CSV_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

/**
 * GUID of the ThoughtSpot connection object that already has access to the
 * `HETARTHDEMOS` Snowflake database — resolved once at runtime (see
 * src/lib/thoughtspot-connection.ts) via a metadata search rather than
 * hardcoded, since it isn't knowable ahead of time from this codebase.
 * Left here as the single place a known-good GUID could be pinned once
 * discovered, to skip the lookup on every request.
 */
export const THOUGHTSPOT_SNOWFLAKE_CONNECTION_ID: string | undefined =
  "72cc9c3b-3148-478d-b456-340c5e910ea8";

/**
 * Per-page Agentspot apps, launched from a header button on their
 * respective pages (same popup-window pattern as `THOUGHTSPOT_AGENTS`,
 * same Premium-only gating).
 */
export const THOUGHTSPOT_PAGE_AGENTS = {
  analytics: {
    label: "Pricing Analytics Agent",
    url: "https://se-thoughtspot-cloud-primary.agentspot.thoughtspot.cloud/apps/01a03fe6-9ed9-76ca-9fe5-47ea0919a4fa",
  },
  governance: {
    label: "Governance & M&A Agent",
    url: "https://se-thoughtspot-cloud-primary.agentspot.thoughtspot.cloud/apps/01a09f5c-fa9c-70f4-a93d-c5b8041324c7",
  },
} as const;
