"use client";

import { Flex, Text } from "@chakra-ui/react";

import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";
import { usePlanStore } from "@/stores/plan";

/**
 * A live, two-way Basic ⇄ Premium switch for demoing — not just an
 * "Upgrade" one-way door. Flipping back to Basic also resets the free
 * question counter so the paywall can be re-demoed immediately.
 */
export function PlanBadge() {
  const plan = usePlanStore((state) => state.plan);
  const upgradeToPremium = usePlanStore((state) => state.upgradeToPremium);
  const downgradeToBasic = usePlanStore((state) => state.downgradeToBasic);
  const isPremium = plan === "premium";

  return (
    <Flex align="center" gap="8px">
      <Text
        fontFamily="mono"
        fontSize="10.5px"
        letterSpacing="0.08em"
        textTransform="uppercase"
        color={isPremium ? "sidebarSubtle" : "white"}
        transition="color 0.2s"
      >
        Basic
      </Text>
      <ChakraButtonEl
        type="button"
        onClick={() => (isPremium ? downgradeToBasic() : upgradeToPremium())}
        aria-label={isPremium ? "Switch to Basic plan" : "Switch to Premium plan"}
        position="relative"
        w="38px"
        h="20px"
        borderRadius="full"
        bg={isPremium ? "gt.500" : "sidebarBorder"}
        cursor="pointer"
        flexShrink={0}
        transition="background-color 0.2s"
        _hover={{ opacity: 0.9 }}
      >
        <Flex
          position="absolute"
          top="2px"
          left={isPremium ? "20px" : "2px"}
          w="16px"
          h="16px"
          borderRadius="full"
          bg="white"
          align="center"
          justify="center"
          transition="left 0.2s cubic-bezier(0.16,1,0.3,1)"
          boxShadow="0 1px 3px rgba(0,0,0,0.3)"
        >
          {isPremium ? (
            <ChakraSvg viewBox="0 0 20 20" w="9px" h="9px" fill="none">
              <path
                d="M3 7l3 2 4-6 4 6 3-2-1.4 8.4a1 1 0 01-1 .83H5.4a1 1 0 01-1-.83L3 7z"
                fill="#4B2882"
              />
            </ChakraSvg>
          ) : null}
        </Flex>
      </ChakraButtonEl>
      <Text
        fontFamily="mono"
        fontSize="10.5px"
        letterSpacing="0.08em"
        textTransform="uppercase"
        color={isPremium ? "gt.300" : "sidebarSubtle"}
        transition="color 0.2s"
      >
        Premium
      </Text>
    </Flex>
  );
}
