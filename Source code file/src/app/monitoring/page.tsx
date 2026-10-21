import { Box, Flex } from "@chakra-ui/react";
import type { Metadata } from "next";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MonitoringExplorer } from "@/components/monitoring/monitoring-explorer";

export const metadata: Metadata = {
  title: "Risk & Compliance Map",
};

export default function MonitoringPage() {
  return (
    <Flex
      minH="100vh"
      align="stretch"
      bg="bg.canvas"
      transition="background-color 0.3s"
      backgroundImage={{
        base:
          "radial-gradient(1100px 520px at 12% -8%, rgba(75,40,130,.08), rgba(75,40,130,0) 70%), radial-gradient(rgba(75,40,130,.07) 1px, rgba(75,40,130,0) 1.4px)",
        _dark:
          "radial-gradient(1100px 520px at 12% -8%, rgba(139,95,196,.14), rgba(139,95,196,0) 70%), radial-gradient(rgba(139,95,196,.1) 1px, rgba(139,95,196,0) 1.4px)",
      }}
      backgroundSize="100% 100%, 22px 22px"
    >
      <AppSidebar active="monitoring" />

      <Box
        as="main"
        flex="1"
        minW={0}
        px={{ base: "20px", md: "44px" }}
        py={{ base: "24px", md: "44px" }}
        pb={{ base: "48px", md: "80px" }}
      >
        <MonitoringExplorer />
      </Box>
    </Flex>
  );
}
