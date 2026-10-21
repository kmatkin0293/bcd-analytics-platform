"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { SpotterEmbed } from "@thoughtspot/visual-embed-sdk/react";
import { Component, type ReactNode } from "react";

import { ChakraButtonEl } from "@/components/chakra-elements";
import { VeraMark } from "@/components/vera/vera-mark";
import { useThoughtSpotAuth } from "@/components/thoughtspot/thoughtspot-auth-provider";
import { THOUGHTSPOT_MODEL_ID } from "@/config";
import type { UploadedTable } from "@/stores/uploaded-tables";

class ExplorerErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Flex align="center" justify="center" minH="500px">
          <Text fontFamily="mono" fontSize="12px" color="fg.muted">
            Couldn&apos;t load this view. Try selecting it again.
          </Text>
        </Flex>
      );
    }
    return this.props.children;
  }
}

/** Grant Thornton purple + white-labelled copy, applied to this embed only. */
const VERA_EMBED_CUSTOMIZATIONS = {
  style: {
    customCSS: {
      variables: {
        "--ts-var-root-background": "#FFFFFF",
        "--ts-var-button--primary-background": "#4B2882",
        "--ts-var-button--primary--hover-background": "#3E2070",
        "--ts-var-button--primary--active-background": "#32195D",
        "--ts-var-chip--active-background": "#F3EEF9",
        "--ts-var-chip--active-color": "#4B2882",
        "--ts-var-spotter-input-background": "#F8F5FC",
        "--ts-var-spotter-prompt-background": "#F3EEF9",
      },
    },
  },
  content: {
    strings: {
      Spotter: "Vera",
      "Ask Spotter": "Ask Vera",
    },
  },
};

const VERA_CHAT_CONFIG = {
  hideToolResponseCardBranding: true,
  toolResponseCardBrandingLabel: "Vera",
};

export function CsvExplorer({
  table,
  combineWithMain,
  onCombineWithMainChange,
}: {
  table: UploadedTable;
  combineWithMain: boolean;
  onCombineWithMainChange: (value: boolean) => void;
}) {
  const { auth } = useThoughtSpotAuth();

  if (!table.worksheetGuid) {
    return (
      <Flex
        align="center"
        justify="center"
        minH="500px"
        direction="column"
        gap="10px"
      >
        <Text fontSize="14px" fontWeight="600" color="fg.default">
          This dataset isn&apos;t askable yet
        </Text>
        <Text fontSize="12.5px" color="fg.muted" maxW="40ch" textAlign="center">
          The data uploaded fine, but registering it with the analytics engine
          failed. Try removing it and uploading again.
        </Text>
      </Flex>
    );
  }

  const dataSources = combineWithMain
    ? [table.worksheetGuid, THOUGHTSPOT_MODEL_ID]
    : [table.worksheetGuid];

  return (
    <Box>
      <Flex align="center" gap="10px" pb="12px">
        <VeraMark size={22} />
        <Text fontSize="14px" fontWeight="700" color="fg.default">
          Ask Vera about {table.fileName}
        </Text>
      </Flex>

      <Flex
        align="center"
        justify="space-between"
        pb="14px"
        wrap="wrap"
        gap="10px"
      >
        <Text
          fontFamily="mono"
          fontSize="11px"
          letterSpacing="0.1em"
          textTransform="uppercase"
          color="fg.muted"
        >
          {table.tableName}
        </Text>
        <ChakraButtonEl
          type="button"
          onClick={() => onCombineWithMainChange(!combineWithMain)}
          display="flex"
          alignItems="center"
          gap="8px"
          px="12px"
          py="7px"
          borderRadius="7px"
          borderWidth="1px"
          borderColor={combineWithMain ? "gt.500" : "border.strong"}
          bg={combineWithMain ? "gt.500" : "transparent"}
          color={combineWithMain ? "white" : "fg.subtle"}
          fontFamily="mono"
          fontSize="11px"
          fontWeight="700"
          letterSpacing="0.04em"
          textTransform="uppercase"
          cursor="pointer"
          transition="all 0.15s"
        >
          Combine with main data
        </ChakraButtonEl>
      </Flex>

      <Box bg="transparent" minH="640px" key={dataSources.join(",")}>
        {auth.status === "authenticated" ? (
          <ExplorerErrorBoundary>
            <SpotterEmbed
              dataSources={dataSources}
              customizations={VERA_EMBED_CUSTOMIZATIONS}
              spotterChatConfig={VERA_CHAT_CONFIG}
              frameParams={{ width: "100%", height: "680px" }}
            />
          </ExplorerErrorBoundary>
        ) : (
          <Flex align="center" justify="center" minH="640px">
            <Text fontFamily="mono" fontSize="12px" color="fg.muted">
              Signing in…
            </Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
}
