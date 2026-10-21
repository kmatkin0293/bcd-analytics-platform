import { Box } from "@chakra-ui/react";
import type { Metadata } from "next";

import { ConfigView } from "@/components/config/config-view";

export const metadata: Metadata = {
  title: "Config",
  robots: { index: false, follow: false },
};

// Intentionally not linked from anywhere in the app's nav — reachable only by
// navigating here directly.
export default function ConfigPage() {
  return (
    <Box w="100%" minH="100vh" bg="bg.canvas">
      <ConfigView />
    </Box>
  );
}
