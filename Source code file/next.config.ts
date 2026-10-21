import type { NextConfig } from "next";

import "./src/env";

const nextConfig: NextConfig = {
  // Emits a minimal, self-contained .next/standalone/server.js (only the
  // files each page's dependency trace actually needs) for the Dockerfile.
  output: "standalone",
};

export default nextConfig;
