"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LockIcon } from "@/components/agents/agent-icons";
import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";
import { UploadDrawer } from "@/components/csv-upload/upload-drawer";
import { usePlanStore } from "@/stores/plan";

function UploadIcon() {
  return (
    <ChakraSvg viewBox="0 0 24 24" w="15px" h="15px" fill="none">
      <path
        d="M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5M5 16.5V19a2 2 0 002 2h10a2 2 0 002-2v-2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ChakraSvg>
  );
}

/** Sidebar trigger for the CSV-upload drawer — Premium-only, same locked/tooltip pattern as the Agents nav. */
export function UploadButton() {
  const router = useRouter();
  const plan = usePlanStore((s) => s.plan);
  const openUpgradeDialog = usePlanStore((s) => s.openUpgradeDialog);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isPremium = plan === "premium";

  return (
    <Box position="relative">
      <ChakraButtonEl
        type="button"
        onClick={() => (isPremium ? setOpen(true) : openUpgradeDialog())}
        onMouseEnter={() => !isPremium && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="10px"
        w="100%"
        px="12px"
        py="11px"
        borderRadius="8px"
        bg="transparent"
        color={isPremium ? "sidebarMuted" : "sidebarSubtle"}
        fontSize="13px"
        letterSpacing="0.01em"
        cursor="pointer"
        transition="color 0.2s, background-color 0.2s, transform 0.15s"
        _hover={{
          color: "white",
          bg: "sidebarSurface",
          transform: "translateX(2px)",
        }}
      >
        <Flex align="center" gap="12px">
          <UploadIcon />
          Upload data
        </Flex>
        {!isPremium ? (
          <Flex
            align="center"
            justify="center"
            w="18px"
            h="18px"
            borderRadius="full"
            bg="sidebarSurface"
            color="sidebarSubtle"
            flexShrink={0}
          >
            <LockIcon />
          </Flex>
        ) : null}
      </ChakraButtonEl>

      {hovered && !isPremium ? (
        <Box
          position="absolute"
          left="100%"
          top="50%"
          transform="translateY(-50%)"
          ml="8px"
          px="10px"
          py="6px"
          borderRadius="6px"
          bg="sidebarSurface"
          borderWidth="1px"
          borderColor="sidebarBorder"
          whiteSpace="nowrap"
          fontFamily="mono"
          fontSize="10.5px"
          letterSpacing="0.04em"
          color="gt.300"
          zIndex={10}
          pointerEvents="none"
          boxShadow="0 8px 20px rgba(0,0,0,0.35)"
        >
          <Text as="span">Premium only — click to upgrade</Text>
        </Box>
      ) : null}

      {open ? (
        <UploadDrawer
          onClose={() => setOpen(false)}
          onAskQuestions={(tableName) => {
            setOpen(false);
            router.push(`/explore?table=${encodeURIComponent(tableName)}`);
          }}
        />
      ) : null}
    </Box>
  );
}
