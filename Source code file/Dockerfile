# syntax=docker/dockerfile:1

# pnpm is pinned via package.json's "packageManager" (11.23.0), which
# requires Node >= 22.13 — confirmed by testing this build against
# node:20-alpine, which corepack refused to run pnpm under.
FROM node:22-alpine AS base
RUN corepack enable

# ---- Dependencies ----
FROM base AS deps
# Needed by some native deps (sharp, etc.) on Alpine's musl libc.
RUN apk add --no-cache libc6-compat
WORKDIR /app
# pnpm-workspace.yaml carries allowBuilds (pnpm 11's project-level allowlist
# for dependency install scripts) — omitting it here caused a real
# ERR_PNPM_IGNORED_BUILDS failure on the sibling iot-manufacturing project's
# Dockerfile, which this one is modeled on.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These five get inlined into the client bundle, so they must be the real
# values, supplied via --build-arg (see README/CLAUDE.md) — they're not
# secret (liveboard/model GUIDs and a host URL are visible in the browser
# regardless of how they got there).
ARG NEXT_PUBLIC_THOUGHTSPOT_HOST
ARG NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS
ARG NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS
ARG NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS
ARG NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS
ENV NEXT_PUBLIC_THOUGHTSPOT_HOST=$NEXT_PUBLIC_THOUGHTSPOT_HOST \
    NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS=$NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS \
    NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS=$NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS \
    NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS=$NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS \
    NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS=$NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS

# THOUGHTSPOT_SECRET_KEY / THOUGHTSPOT_ORG_ID / ANTHROPIC_API_KEY are real
# secrets and must never land in a build arg or image layer (docker history
# would expose them to anyone with the image). src/env.ts validates these
# eagerly (next.config.ts imports it at the top level, so even loading the
# Next config triggers the check) — but it also supports a
# SKIP_ENV_VALIDATION escape hatch specifically for this, so the build
# doesn't need a fake-but-schema-valid value for every field (THOUGHTSPOT_ORG_ID
# is z.coerce.number(), so a placeholder string like "build-placeholder"
# would itself fail validation). Nothing executed at build time actually
# calls out with these values. The real values are supplied only as
# container runtime env vars (Coolify's env var config, not its build args)
# — src/env.ts reads process.env fresh when the server process actually
# starts, so the real runtime values take over from there.
ENV SKIP_ENV_VALIDATION=1

RUN pnpm build

# ---- Run ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# THOUGHTSPOT_SECRET_KEY / THOUGHTSPOT_ORG_ID / ANTHROPIC_API_KEY were never
# set at build time (see builder stage above) — this running server needs
# the real values, supplied as regular container runtime env vars (Coolify's
# env var config, applied to the running app, not its build step). The
# NEXT_PUBLIC_* values, by contrast, are already baked into the built JS and
# don't need to be (and can't be changed by) anything set here.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
