import { Box, Flex, Text } from "@chakra-ui/react";

import { AgentNav } from "@/components/agents/agent-nav";
import { BrandMark } from "@/components/brand-mark";
import { ChakraNextLink } from "@/components/chakra-next-link";
import { ExploreNavItem } from "@/components/csv-upload/explore-nav-item";
import { UploadButton } from "@/components/csv-upload/upload-button";
import { PlanBadge } from "@/components/plan/plan-badge";
import { UpgradeDialog } from "@/components/plan/upgrade-dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getInitials, getThoughtSpotSession } from "@/lib/thoughtspot-session";

export type NavKey =
  | "overview"
  | "analytics"
  | "monitoring"
  | "governance"
  | "explore";

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "overview", label: "Overview", href: "/home" },
  { key: "analytics", label: "Pricing Analytics", href: "/analytics" },
  { key: "monitoring", label: "Risk & Compliance Map", href: "/monitoring" },
  { key: "governance", label: "Governance & M&A", href: "/governance" },
];

export async function AppSidebar({ active }: { active: NavKey }) {
  const session = await getThoughtSpotSession();
  const displayName = session?.displayName || session?.username || "Signed in";
  const initials = getInitials(displayName) || "?";

  return (
    <Box
      as="aside"
      flex="0 0 220px"
      alignSelf="stretch"
      bg="sidebarInk"
      color="sidebarText"
      display="flex"
      flexDirection="column"
      gap="36px"
      py="22px"
      position="sticky"
      top={0}
      h="100vh"
    >
      {/* Grant Thornton logo mark */}
      <Flex align="center" justify="space-between" px="18px">
        <ChakraNextLink
          href="/"
          display="flex"
          alignItems="center"
          gap="10px"
          color="sidebarText"
          transition="color 0.2s"
          _hover={{ color: "white" }}
        >
          <BrandMark size={28} priority />

          <Flex direction="column" lineHeight="1.1">
            <Text fontWeight="700" fontSize="13px" letterSpacing="-0.01em">
              Grant Thornton
            </Text>
            <Text fontSize="10px" color="sidebarMuted" letterSpacing="0.04em">
              Pricing &amp; Risk
            </Text>
          </Flex>
        </ChakraNextLink>
      </Flex>

      <Flex as="nav" direction="column" px="10px" gap="2px">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <ChakraNextLink
              key={item.key}
              href={item.href}
              display="flex"
              alignItems="center"
              gap="12px"
              px="12px"
              py="11px"
              borderRadius="8px"
              bg={isActive ? "sidebarSurface" : "transparent"}
              color={isActive ? "white" : "sidebarMuted"}
              fontSize="13px"
              fontWeight={isActive ? "600" : "400"}
              letterSpacing="0.01em"
              position="relative"
              transition="color 0.2s, background-color 0.2s, transform 0.15s"
              _hover={{
                color: "white",
                bg: "sidebarSurface",
                transform: "translateX(2px)",
              }}
            >
              <Box
                position="absolute"
                left="0"
                top="18%"
                bottom="18%"
                w="2.5px"
                borderRadius="full"
                bg="gt.400"
                opacity={isActive ? 1 : 0}
                transition="opacity 0.2s"
              />
              {item.label}
            </ChakraNextLink>
          );
        })}
        <ExploreNavItem active={active === "explore"} />
      </Flex>

      <Box px="10px">
        <UploadButton />
      </Box>

      <AgentNav />

      <Box mt="auto" px="18px">
        <Flex align="center" justify="space-between" pb="12px">
          <Text
            fontSize="10px"
            letterSpacing="0.1em"
            textTransform="uppercase"
            color="sidebarSubtle"
          >
            Plan
          </Text>
          <PlanBadge />
        </Flex>
        <Flex align="center" justify="space-between" pb="14px">
          <Text
            fontSize="10px"
            letterSpacing="0.1em"
            textTransform="uppercase"
            color="sidebarSubtle"
          >
            Appearance
          </Text>
          <ThemeToggle dark />
        </Flex>
        <UpgradeDialog />
        <Flex
          align="center"
          gap="10px"
          pt="16px"
          borderTopWidth="1px"
          borderColor="sidebarBorder"
        >
          <Flex
            flexShrink={0}
            w="30px"
            h="30px"
            bg="gt.500"
            color="white"
            align="center"
            justify="center"
            fontSize="11.5px"
            fontWeight="700"
            borderRadius="7px"
          >
            {initials}
          </Flex>
          <Flex direction="column" minW={0}>
            <Text
              fontSize="13px"
              fontWeight="600"
              letterSpacing="-0.01em"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {displayName}
            </Text>
            <ChakraNextLink
              href="/login"
              fontSize="11px"
              color="sidebarSubtle"
              transition="color 0.2s"
              _hover={{ color: "gt.300" }}
            >
              Sign out
            </ChakraNextLink>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
}
