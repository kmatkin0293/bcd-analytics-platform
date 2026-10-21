import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { Metadata } from "next";
import { PageAgentButton } from "@/components/agents/page-agent-button";
import { AnalyticsLiveboard } from "@/components/analytics/analytics-liveboard";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { THOUGHTSPOT_PAGE_AGENTS } from "@/config";
import { formatTodayLabel } from "@/lib/date";

export const metadata: Metadata = {
  title: "Pricing Analytics",
};

export default function AnalyticsPage() {
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
      <AppSidebar active="analytics" />

      <Box
        as="main"
        flex="1"
        minW={0}
        px={{ base: "20px", md: "44px" }}
        py={{ base: "24px", md: "44px" }}
        pb={{ base: "48px", md: "80px" }}
      >
        <Flex align="flex-start" justify="space-between" gap="20px" wrap="wrap">
          <Box minW={0}>
            <Flex
              align="center"
              gap="11px"
              fontFamily="mono"
              fontSize="11.5px"
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="fg.muted"
            >
              <Box w="6px" h="6px" borderRadius="full" bg="gt.500" />
              {formatTodayLabel()}
            </Flex>

            <Heading
              as="h1"
              mt="16px"
              fontSize={{ base: "32px", md: "50px" }}
              lineHeight="0.98"
              letterSpacing="-0.048em"
              fontWeight="800"
              maxW="22ch"
              color="fg.default"
            >
              Global pricing &amp; quotation performance
            </Heading>
            <Text
              mt="14px"
              fontSize="16.5px"
              lineHeight="1.55"
              color="fg.body"
              maxW="62ch"
            >
              Revenue, margin, discount, and quote-turnaround performance across
              every region, business unit, and channel.
            </Text>
          </Box>

          <Box pt={{ base: 0, md: "4px" }}>
            <PageAgentButton
              url={THOUGHTSPOT_PAGE_AGENTS.analytics.url}
              title={THOUGHTSPOT_PAGE_AGENTS.analytics.label}
            />
          </Box>
        </Flex>

        <AnalyticsLiveboard />
      </Box>
    </Flex>
  );
}
