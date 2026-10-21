# Cohortline — Pharma Clinical Trials Demo

A demo SaaS application imitating a CTMS (Clinical Trial Management System) for the
fictitious company **Cohortline**. Built with [Next.js](https://nextjs.org) (App
Router) and [Chakra UI v3](https://chakra-ui.com), it showcases embedded analytics
from ThoughtSpot — surfaced both as dashboards and as **Vera**, an in-app AI
analytics assistant. The ThoughtSpot integration is intentionally white-labeled:
end users never see ThoughtSpot branding or terminology. Deploys as a Docker
image (`Dockerfile`), intended for self-hosting via Coolify — see
[Docker](#docker) and [Deploying with Coolify](#deploying-with-coolify) below.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (or set `PORT` to run on a
different port, e.g. `PORT=4000 pnpm dev`, if 3000 is already in use).

### Environment variables

Create `.env.local` at the project root with:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_THOUGHTSPOT_HOST` | Public URL of the ThoughtSpot instance (no trailing slash) |
| `THOUGHTSPOT_SECRET_KEY` | Trusted-auth secret key from ThoughtSpot — server-side only |
| `THOUGHTSPOT_ORG_ID` | Org ID to authenticate into |
| `NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS` | GUID of the liveboard embedded on `/analytics` |
| `NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS` | GUID of the liveboard embedded on `/monitoring` once a country is selected |
| `NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS` | GUID reserved for a facility-level liveboard — validated but not yet wired to a page |
| `NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS` | GUID of the ThoughtSpot data model/data source Vera and `/monitoring`'s search API are scoped to |
| `ANTHROPIC_API_KEY` | Anthropic API key powering Vera (Claude) |

All env vars are validated centrally in `src/env.ts` via `@t3-oss/env-nextjs`.
Content IDs derived from them (liveboard/model GUIDs), plus a few hardcoded
ThoughtSpot object GUIDs (columns, a viz ID), are re-exported from
`src/config.ts` for use in components.

## Docker

`Dockerfile` is a multi-stage build (Node 22 Alpine — pnpm's pinned version
requires it) producing a minimal `output: "standalone"` image. For local
testing, `compose.yaml` + these scripts source every var from `.env.local`
automatically, so nothing needs to be retyped:

```bash
pnpm docker:up     # build + run in the background
pnpm docker:logs   # tail its output
pnpm docker:down   # stop and remove it
```

`compose.yaml` is local-only — it has no effect on Coolify, which builds the
`Dockerfile` directly (see below).

## Deploying with Coolify

Coolify builds `Dockerfile` itself; this app's env vars split across two
different Coolify settings depending on when each is needed, and getting this
wrong produces two different failures:

- **Build-time** (Coolify: check **"Build Variable?"** for each) — these get
  inlined into the client bundle by `next build`, so a missing one fails the
  build itself:
  - `NEXT_PUBLIC_THOUGHTSPOT_HOST`, `NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS`,
    `NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS`, `NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS`,
    `NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS`
- **Runtime-only** (Coolify: leave **"Build Variable?" unchecked**) — real
  secrets, deliberately never passed into the Docker build (which would bake
  them into the image's layer history):
  - `THOUGHTSPOT_SECRET_KEY`, `THOUGHTSPOT_ORG_ID`, `ANTHROPIC_API_KEY`
  - Missing/wrong here doesn't fail the build — it crashes the *running*
    container at startup instead, and shows as Next's generic "This page
    couldn't load. A server error occurred." on any dynamic page. Check
    Coolify's application/runtime logs (not the build logs) to confirm — they'll
    show `❌ Invalid environment variables`.

One more thing outside this repo entirely: ThoughtSpot's own CORS allowlist
and CSP Visual Embed Hosts (Develop → Customizations → Security Settings, on
the ThoughtSpot instance) need the deployed domain added, or embeds and
Trusted Auth calls fail cross-origin.

## Pages

| Route | Description |
| --- | --- |
| `/` | Marketing landing page |
| `/login` | Sign-in — only the username field is functional; password is decorative |
| `/home` | Dashboard: at-a-glance KPIs, task list, and the Vera chat entry point |
| `/analytics` | Pipeline health dashboard |
| `/monitoring` | Facility-country map, ranked country list, and per-country case flow (see [Monitoring](#monitoring)) |
| `/config` | Hidden demo-control page (not linked in nav) for Vera's query-limit gating and hotkey phrase expansion |

## Authentication

Signing in (username only) hits `POST /api/auth/token`, which:

1. Mints a per-user ThoughtSpot full-access token (valid 8 hours) via
   `@thoughtspot/rest-api-sdk`.
2. Looks up the user's real display name via `UsersApi.searchUsers` (falls back
   to the raw username if unavailable).
3. Stores `{ username, displayName, token, expiresAt }` in an httpOnly, secure
   `ts_session` cookie whose expiry matches the token's own expiry.

`src/components/thoughtspot/thoughtspot-auth-provider.tsx` is mounted once in the
root layout, checks for a session on load, and once authenticated initializes the
ThoughtSpot Visual Embed SDK for the whole app (so embeds work on any page without
re-initializing) and starts `startAutoMCPFrameRenderer` so any embedded
visualization iframe Vera renders gets swapped for a fully authenticated embed.

## Vera

Vera is a streaming AI assistant (Claude Sonnet, via the Anthropic API) connected
to ThoughtSpot's Spotter MCP server through Anthropic's MCP connector. Highlights:

- Responses stream token-by-token — nothing waits for a full response.
- Scoped to a single data model (`NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS`) via
  the system prompt, since the MCP connector can't force tool arguments directly.
- Renders Markdown (with GitHub-flavored extensions) and any embedded
  visualization the tool returns, inline, at a minimum height of 600px.
- Fully white-labeled: Vera never mentions ThoughtSpot, Spotter, MCP, or any
  underlying vendor/tool name, even if asked directly.
- Multi-turn: follow-up questions reuse the same analysis session and stay in
  context for the life of the chat modal.

See `src/lib/vera.ts` (system prompt + MCP config) and `src/app/api/vera/chat/route.ts`
(streaming route handler) for the implementation.

## Monitoring

`/monitoring` renders a D3 + topojson world map of study counts by facility
country, driven by live ThoughtSpot data rather than a static dataset:

- `GET /api/monitoring/facility-countries` runs a ThoughtSpot `searchData`
  query (`[Facility Country] [Study Count] [Start Date].'last 12 months'`),
  using the signed-in user's own session token, and returns the aggregated
  rows. `src/lib/monitoring-data.ts` turns that into the lookup structures the
  map, ranked list, and detail panel all share.
- Because of how the underlying model is joined, a study with no recorded
  facility country never comes back as a row from that query — so the "No
  country recorded" row in the ranked list intentionally shows no count, just
  a "View analytics" affordance, rather than a misleading `0`.
- Selecting a country (via the map, the ranked list, or that "No country
  recorded" row) embeds the `NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS` liveboard,
  runtime-filtered to that country's name (or the literal value `"{Null}"` for
  the unattributed bucket).
- Clicking a point on that liveboard's "Monthly Completion Rate Trend"
  visualization (matched by a hardcoded viz GUID via
  `EmbedEvent.VizPointClick`) surfaces an "Open Case" button, which opens a
  dialog prefilled with the country and completion rate and a comments field.

See `src/components/monitoring/monitoring-explorer.tsx`,
`src/app/api/monitoring/facility-countries/route.ts`, and
`src/lib/monitoring-data.ts` for the implementation.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Chakra UI v3](https://chakra-ui.com) for UI and theming
- [`@t3-oss/env-nextjs`](https://env.t3.gg) for env var validation
- [`@thoughtspot/rest-api-sdk`](https://developers.thoughtspot.com) and
  [`@thoughtspot/visual-embed-sdk`](https://developers.thoughtspot.com) for
  ThoughtSpot auth and embedding
- [`@anthropic-ai/sdk`](https://platform.claude.com) for Vera
- [D3](https://d3js.org) + [`topojson-client`](https://github.com/topojson/topojson-client)
  for the `/monitoring` world map
- [Zustand](https://zustand.docs.pmnd.rs) (with `immer` + `persist`) for
  client-side state on `/config` (hotkeys, Vera usage gating)
- [Biome](https://biomejs.dev) for linting/formatting (`pnpm lint`, `pnpm format`)

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Chakra UI Documentation](https://chakra-ui.com/docs)
- [ThoughtSpot Developer Documentation](https://developers.thoughtspot.com)
