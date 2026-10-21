"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { useState } from "react";

import { AgentLaunchModal } from "@/components/agents/agent-launch-modal";
import { LockIcon, ZapIcon } from "@/components/agents/agent-icons";
import { ChakraButtonEl } from "@/components/chakra-elements";
import { THOUGHTSPOT_AGENTS } from "@/config";
import { usePlanStore } from "@/stores/plan";

export function AgentNav() {
  const plan = usePlanStore((state) => state.plan);
  const openUpgradeDialog = usePlanStore((state) => state.openUpgradeDialog);
  const [activeAgent, setActiveAgent] = useState<{ url: string; title: string } | null>(null);
  const [hoveredLocked, setHoveredLocked] = useState<string | null>(null);
  const isPremium = plan === "premium";

  return (
    <Box px="10px">
      <Text
        px="12px"
        pb="6px"
        fontSize="10px"
        letterSpacing="0.1em"
        textTransform="uppercase"
        color="sidebarSubtle"
      >
        Agents
      </Text>
      <Flex direction="column" gap="2px">
        {THOUGHTSPOT_AGENTS.map((agent) => (
          <Box key={agent.id} position="relative">
            <ChakraButtonEl
              type="button"
              onClick={() =>
                isPremium
                  ? setActiveAgent({ url: agent.url, title: agent.label })
                  : openUpgradeDialog()
              }
              onMouseEnter={() => !isPremium && setHoveredLocked(agent.id)}
              onMouseLeave={() => setHoveredLocked(null)}
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
                <ZapIcon />
                {agent.label}
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
            {hoveredLocked === agent.id ? (
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
                Premium only — click to upgrade
              </Box>
            ) : null}
          </Box>
        ))}
      </Flex>

      {activeAgent ? (
        <AgentLaunchModal
          url={activeAgent.url}
          title={activeAgent.title}
          onClose={() => setActiveAgent(null)}
        />
      ) : null}
    </Box>
  );
}
