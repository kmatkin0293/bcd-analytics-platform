"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { HostEvent } from "@thoughtspot/visual-embed-sdk";
import {
  LiveboardEmbed,
  useEmbedRef,
} from "@thoughtspot/visual-embed-sdk/react";

import { ChakraButtonEl } from "@/components/chakra-elements";
import { useThoughtSpotAuth } from "@/components/thoughtspot/thoughtspot-auth-provider";
import { VeraChat } from "@/components/vera/vera-chat";
import { THOUGHTSPOT_LIVEBOARD_ID, THOUGHTSPOT_PRICING_COLUMN_IDS } from "@/config";

const FILTER_COLUMNS = [
  { label: "Calendar Date", columnId: THOUGHTSPOT_PRICING_COLUMN_IDS.calendarDate },
  { label: "Region", columnId: THOUGHTSPOT_PRICING_COLUMN_IDS.region },
  { label: "Business Unit", columnId: THOUGHTSPOT_PRICING_COLUMN_IDS.businessUnit },
  { label: "Product Category", columnId: THOUGHTSPOT_PRICING_COLUMN_IDS.productCategory },
  { label: "Customer Segment", columnId: THOUGHTSPOT_PRICING_COLUMN_IDS.customerSegment },
  { label: "Channel", columnId: THOUGHTSPOT_PRICING_COLUMN_IDS.channel },
  { label: "Quote Status", columnId: THOUGHTSPOT_PRICING_COLUMN_IDS.quoteStatus },
];

export function AnalyticsLiveboard() {
  const { auth } = useThoughtSpotAuth();
  const embedRef = useEmbedRef<typeof LiveboardEmbed>();

  return (
    <Box mt={{ base: "22px", md: "30px" }}>
      <Flex wrap="wrap" gap="10px" align="center" pb="18px">
        <Text
          fontFamily="mono"
          fontSize="11px"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="fg.muted"
          mr="4px"
        >
          Filters
        </Text>
        {FILTER_COLUMNS.map((filter) => (
          <ChakraButtonEl
            key={filter.columnId}
            type="button"
            onClick={() =>
              embedRef.current?.trigger(HostEvent.OpenFilter, {
                column: { columnId: filter.columnId },
              })
            }
            display="flex"
            alignItems="center"
            gap="9px"
            borderWidth="1px"
            borderRadius="8px"
            borderColor="border.strong"
            bg="bg.canvas"
            color="fg.default"
            px="14px"
            py="10px"
            fontFamily="mono"
            fontSize="12px"
            letterSpacing="0.04em"
            cursor="pointer"
            transition="background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.15s"
            _hover={{ bg: "fg.default", color: "bg.canvas", borderColor: "fg.default", transform: "translateY(-1px)" }}
            _active={{ transform: "scale(0.97)" }}
          >
            <Box w="5px" h="5px" borderRadius="full" bg="gt.400" />
            {filter.label}
          </ChakraButtonEl>
        ))}
        <VeraChat trigger="button" />
      </Flex>

      <Box bg="transparent" minH="900px">
        {auth.status === "authenticated" ? (
          <LiveboardEmbed
            ref={embedRef}
            liveboardId={THOUGHTSPOT_LIVEBOARD_ID}
            fullHeight
            minimumHeight={900}
            frameParams={{ width: "100%" }}
          />
        ) : (
          <Flex align="center" justify="center" minH="900px">
            <Text fontFamily="mono" fontSize="12px" color="fg.muted">
              Signing in…
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
}
