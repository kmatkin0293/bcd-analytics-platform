import { Box, Flex, Heading } from "@chakra-ui/react";
import type { Metadata } from "next";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { HomeInsights } from "@/components/home/home-insights";
import { VeraChat } from "@/components/vera/vera-chat";
import { formatTodayLabel } from "@/lib/date";
import { getFirstName, getThoughtSpotSession } from "@/lib/thoughtspot-session";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function HomePage() {
  const session = await getThoughtSpotSession();
  const firstName = getFirstName(
    session?.displayName || session?.username || "there",
  );

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
      <AppSidebar active="overview" />

      <Box
        as="main"
        flex="1"
        minW={0}
        px={{ base: "20px", md: "44px" }}
        py={{ base: "24px", md: "44px" }}
        pb={{ base: "48px", md: "80px" }}
      >
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
          mt="18px"
          fontSize={{ base: "34px", md: "56px" }}
          lineHeight="0.96"
          letterSpacing="-0.048em"
          fontWeight="800"
          color="fg.default"
        >
          Morning, {firstName}.
        </Heading>

        <VeraChat />

        <HomeInsights />
      </Box>
    </Flex>
  );
}
