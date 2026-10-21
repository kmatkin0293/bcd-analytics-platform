"use client";

import {
  Box,
  Field,
  Flex,
  Heading,
  Input,
  Switch,
  Text,
} from "@chakra-ui/react";

import { ChakraButtonEl } from "@/components/chakra-elements";
import { ChakraNextLink } from "@/components/chakra-next-link";
import { HotkeysConfig } from "@/components/config/hotkeys-config";
import { usePlanStore } from "@/stores/plan";

function parseCount(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

export function ConfigView() {
  const plan = usePlanStore((state) => state.plan);
  const basicQuestionsUsed = usePlanStore((state) => state.basicQuestionsUsed);
  const basicQuestionsLimit = usePlanStore((state) => state.basicQuestionsLimit);
  const setPlan = usePlanStore((state) => state.setPlan);
  const reset = usePlanStore((state) => state.reset);
  const setBasicQuestionsLimit = usePlanStore(
    (state) => state.setBasicQuestionsLimit,
  );
  const setBasicQuestionsUsed = usePlanStore(
    (state) => state.setBasicQuestionsUsed,
  );

  return (
    <Box
      maxW="560px"
      mx="auto"
      px={{ base: "20px", md: "0" }}
      py={{ base: "48px", md: "80px" }}
    >
      <ChakraNextLink
        href="/home"
        display="flex"
        alignItems="center"
        gap="10px"
      >
        <Flex
          w="28px"
          h="28px"
          bg="gt.500"
          align="center"
          justify="center"
          borderRadius="2px"
          flexShrink={0}
        >
          <Text color="white" fontWeight="800" fontSize="10px" letterSpacing="-0.04em">
            GT
          </Text>
        </Flex>
        <Text fontWeight="700" fontSize="15px" letterSpacing="-0.02em">
          Grant Thornton
        </Text>
      </ChakraNextLink>

      <Text
        mt="32px"
        fontFamily="mono"
        fontSize="11.5px"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color="fg.muted"
      >
        Internal
      </Text>
      <Heading
        as="h1"
        mt="10px"
        fontSize={{ base: "30px", md: "38px" }}
        lineHeight="1.05"
        letterSpacing="-0.03em"
        fontWeight="800"
      >
        Demo config
      </Heading>
      <Text mt="10px" fontSize="15px" color="fg.body" maxW="46ch">
        Controls for running this demo — not linked from anywhere in the app.
      </Text>

      <Flex direction="column" gap="24px" mt={{ base: "32px", md: "44px" }}>
        <Box
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          p="20px"
        >
          <Flex justify="space-between" align="center" gap="12px">
            <Box>
              <Text
                fontFamily="mono"
                fontSize="11px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="fg.muted"
              >
                Plan
              </Text>
              <Text mt="6px" fontSize="13px" color="fg.subtle" maxW="38ch">
                Basic allows all liveboards plus a limited number of free
                Vera questions, then shows the upgrade paywall. Premium is
                unlimited.
              </Text>
            </Box>
            <Switch.Root
              checked={plan === "premium"}
              onCheckedChange={(details) =>
                setPlan(details.checked ? "premium" : "basic")
              }
              colorPalette="clay"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Label
                fontFamily="mono"
                fontSize="11px"
                letterSpacing="0.06em"
                textTransform="uppercase"
              >
                {plan === "premium" ? "Premium" : "Basic"}
              </Switch.Label>
            </Switch.Root>
          </Flex>

          <Flex gap="16px" mt="20px" wrap="wrap">
            <Field.Root flex="1" minW="140px">
              <Field.Label
                fontFamily="mono"
                fontSize="11px"
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="fg.subtle"
              >
                Free questions allowed
              </Field.Label>
              <Input
                type="number"
                min={0}
                value={basicQuestionsLimit}
                onChange={(event) => {
                  const parsed = parseCount(event.target.value);
                  if (parsed !== null) setBasicQuestionsLimit(parsed);
                }}
                bg="bg.canvas"
                borderColor="border.strong"
                borderRadius={0}
                fontSize="14px"
              />
            </Field.Root>
            <Field.Root flex="1" minW="140px">
              <Field.Label
                fontFamily="mono"
                fontSize="11px"
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="fg.subtle"
              >
                Questions used
              </Field.Label>
              <Input
                type="number"
                min={0}
                value={basicQuestionsUsed}
                onChange={(event) => {
                  const parsed = parseCount(event.target.value);
                  if (parsed !== null) setBasicQuestionsUsed(parsed);
                }}
                bg="bg.canvas"
                borderColor="border.strong"
                borderRadius={0}
                fontSize="14px"
              />
            </Field.Root>
          </Flex>

          <Flex justify="space-between" align="center" mt="18px">
            <Text fontFamily="mono" fontSize="11.5px" color="fg.muted">
              {plan === "premium"
                ? "Unlimited questions on Premium"
                : `${basicQuestionsUsed} of ${basicQuestionsLimit} free questions used`}
            </Text>
            <ChakraButtonEl
              type="button"
              onClick={reset}
              borderWidth="1px"
              borderColor="border.strong"
              color="fg.subtle"
              px="14px"
              py="8px"
              fontFamily="mono"
              fontSize="11.5px"
              letterSpacing="0.06em"
              textTransform="uppercase"
              cursor="pointer"
              bg="transparent"
              _hover={{ borderColor: "fg.default", color: "fg.default" }}
            >
              Reset to defaults
            </ChakraButtonEl>
          </Flex>
        </Box>

        <Box
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          p="20px"
        >
          <HotkeysConfig />
        </Box>
      </Flex>
    </Box>
  );
}
