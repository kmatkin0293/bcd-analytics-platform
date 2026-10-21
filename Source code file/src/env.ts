import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    THOUGHTSPOT_SECRET_KEY: z.string().min(1),
    THOUGHTSPOT_ORG_ID: z.coerce.number(),
    ANTHROPIC_API_KEY: z.string().min(1),
    // CSV-upload → Snowflake ingestion (src/lib/snowflake.ts). Optional so
    // the rest of the app keeps working with no Snowflake access at all —
    // only the /api/upload-csv routes require these to actually be set.
    SNOWFLAKE_ACCOUNT: z.string().min(1).optional(),
    SNOWFLAKE_USER: z.string().min(1).optional(),
    SNOWFLAKE_PASSWORD: z.string().min(1).optional(),
    SNOWFLAKE_ROLE: z.string().min(1).optional(),
    SNOWFLAKE_WAREHOUSE: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_THOUGHTSPOT_HOST: z.url(),
    NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS: z.string().min(1),
    NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS: z.string().min(1),
    NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS: z.string().min(1),
    NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS: z.string().min(1),
  },
  runtimeEnv: {
    THOUGHTSPOT_SECRET_KEY: process.env.THOUGHTSPOT_SECRET_KEY,
    THOUGHTSPOT_ORG_ID: process.env.THOUGHTSPOT_ORG_ID,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    SNOWFLAKE_ACCOUNT: process.env.SNOWFLAKE_ACCOUNT,
    SNOWFLAKE_USER: process.env.SNOWFLAKE_USER,
    SNOWFLAKE_PASSWORD: process.env.SNOWFLAKE_PASSWORD,
    SNOWFLAKE_ROLE: process.env.SNOWFLAKE_ROLE,
    SNOWFLAKE_WAREHOUSE: process.env.SNOWFLAKE_WAREHOUSE,
    NEXT_PUBLIC_THOUGHTSPOT_HOST: process.env.NEXT_PUBLIC_THOUGHTSPOT_HOST,
    NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS:
      process.env.NEXT_PUBLIC_LIVEBOARD_PHARMA_CLINICAL_TRIALS,
    NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS:
      process.env.NEXT_PUBLIC_LIVEBOARD_FACILITY_ANALYTICS,
    NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS:
      process.env.NEXT_PUBLIC_LIVEBOARD_COUNTRY_STATS,
    NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS:
      process.env.NEXT_PUBLIC_MODEL_PHARMA_CLINICAL_TRIALS,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
