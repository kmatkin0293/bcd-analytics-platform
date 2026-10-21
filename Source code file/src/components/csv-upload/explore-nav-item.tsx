"use client";

import { Box, Flex, Text } from "@chakra-ui/react";

import { ChakraNextLink } from "@/components/chakra-next-link";
import { useUploadedTablesStore } from "@/stores/uploaded-tables";

/**
 * "Explore Uploads" sidebar link — only rendered once ≥1 CSV has been
 * uploaded this session, with a count badge. Lives outside the main
 * (server-rendered) NAV_ITEMS list since it depends on client-only state.
 */
export function ExploreNavItem({ active }: { active: boolean }) {
  const count = useUploadedTablesStore((s) => s.tables.length);

  if (count === 0) return null;

  return (
    <ChakraNextLink
      href="/explore"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap="12px"
      px="12px"
      py="11px"
      borderRadius="8px"
      bg={active ? "sidebarSurface" : "transparent"}
      color={active ? "white" : "sidebarMuted"}
      fontSize="13px"
      fontWeight={active ? "600" : "400"}
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
        opacity={active ? 1 : 0}
        transition="opacity 0.2s"
      />
      <Flex align="center" gap="12px">
        Explore uploads
      </Flex>
      <Flex
        align="center"
        justify="center"
        minW="18px"
        h="18px"
        px="4px"
        borderRadius="full"
        bg="gt.500"
        color="white"
        fontFamily="mono"
        fontSize="10px"
        fontWeight="700"
        flexShrink={0}
      >
        <Text as="span">{count}</Text>
      </Flex>
    </ChakraNextLink>
  );
}
