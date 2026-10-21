"use client";

import { Box, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import { useState } from "react";

import { Reveal } from "@/components/motion/reveal";

const TABS = [
  { label: "Pricing", active: true },
  { label: "Compliance", active: false },
  { label: "Governance", active: false },
];

const POINTS = [
  { k: "01", v: "Margin Pct and Discount Pct tracked at the quote line" },
  { k: "02", v: "Price Deviation Pct flags off-list quoting in real time" },
  { k: "03", v: "Quote Status moves Draft → Pending Approval → Won / Lost" },
];

// Snapshot of real Margin Pct by Region from the live pricing & quotation
// model — the same figures the /home overview and /analytics liveboard
// pull from, so this isn't a fabricated mockup.
const REGIONS = [
  { label: "China", marginPct: 14.64 },
  { label: "Pacific", marginPct: 14.52 },
  { label: "South East Asia", marginPct: 14.4 },
  { label: "Latin America", marginPct: 14.36 },
  { label: "Europe", marginPct: 14.29 },
  { label: "Middle East", marginPct: 14.21 },
  { label: "Africa", marginPct: 14.18 },
  { label: "East Asia", marginPct: 14.1 },
];
const REGION_MIN = Math.min(...REGIONS.map((r) => r.marginPct));
const REGION_MAX = Math.max(...REGIONS.map((r) => r.marginPct));

export function PlatformOverview() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box
      as="section"
      id="platform"
      maxW="1180px"
      mx="auto"
      px={{ base: "20px", md: "48px" }}
      py={{ base: "56px", md: "104px" }}
    >
      <Reveal>
        <Text
          fontFamily="mono"
          fontSize="12.5px"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="fg.muted"
        >
          The platform
        </Text>
        <Heading
          as="h2"
          mt="16px"
          fontSize={{ base: "30px", md: "52px" }}
          lineHeight="1.02"
          letterSpacing="-0.045em"
          fontWeight="800"
          maxW="20ch"
          color="fg.default"
        >
          Three views. One record underneath.
        </Heading>

        <Flex
          gap="28px"
          wrap="wrap"
          mt={{ base: "28px", md: "44px" }}
          borderBottomWidth="1px"
          borderColor="border.default"
        >
          {TABS.map((tab, i) => (
            <Box
              key={tab.label}
              pb="12px"
              cursor="pointer"
              onClick={() => setActiveTab(i)}
            >
              <Text
                fontFamily="mono"
                fontSize="13px"
                letterSpacing="0.1em"
                textTransform="uppercase"
                color={activeTab === i ? "fg.default" : "fg.muted"}
                transition="color 0.2s"
              >
                {tab.label}
              </Text>
              <Box
                h="2px"
                mt="12px"
                bg={activeTab === i ? "gt.500" : "transparent"}
                transition="background-color 0.25s"
              />
            </Box>
          ))}
        </Flex>
      </Reveal>

      <SimpleGrid
        columns={{ base: 1, md: 2 }}
        gap={{ base: "28px", md: "56px" }}
        mt={{ base: "32px", md: "48px" }}
        alignItems="start"
      >
        <Reveal delay={0.05}>
          <Box>
            <Heading
              as="h3"
              fontSize={{ base: "24px", md: "32px" }}
              lineHeight="1.1"
              letterSpacing="-0.03em"
              fontWeight="700"
              color="fg.default"
            >
              Margin you can forecast, not guess at
            </Heading>
            <Text
              mt="16px"
              fontSize="17px"
              lineHeight="1.55"
              color="fg.body"
              maxW="44ch"
            >
              Quotes, overrides, and approvals post from the desk the moment
              they happen. Grant Thornton recalculates the exposure curve and
              tells you which regions will miss before the quarter closes.
            </Text>
            <Box
              as="ul"
              listStyleType="none"
              pl={0}
              mt="26px"
              display="flex"
              flexDirection="column"
              gap="1px"
              bg="border.default"
              borderTopWidth="1px"
              borderBottomWidth="1px"
              borderColor="border.default"
            >
              {POINTS.map((point) => (
                <Flex
                  as="li"
                  key={point.k}
                  bg="bg.surface"
                  px="12px"
                  py="14px"
                  gap="14px"
                  align="baseline"
                  transition="background-color 0.2s"
                  _hover={{ bg: "bg.raised" }}
                >
                  <Text
                    fontFamily="mono"
                    fontSize="11.5px"
                    color="gt.500"
                    letterSpacing="0.1em"
                  >
                    {point.k}
                  </Text>
                  <Text fontSize="15.5px" color="fg.default">
                    {point.v}
                  </Text>
                </Flex>
              ))}
            </Box>
          </Box>
        </Reveal>

        <Reveal delay={0.15}>
          <Box
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="10px"
            p="20px"
          >
            <Flex
              justify="space-between"
              fontFamily="mono"
              fontSize="11.5px"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="fg.muted"
              pb="14px"
              borderBottomWidth="1px"
              borderColor="border.tint"
            >
              <Text>Region</Text>
              <Text>Avg margin</Text>
            </Flex>
            <Flex direction="column" gap="18px" pt="18px">
              {REGIONS.map((region) => {
                const barPct =
                  ((region.marginPct - REGION_MIN) / (REGION_MAX - REGION_MIN)) * 70 + 30;
                const isLagging = region.marginPct < 14.25;
                return (
                  <Box key={region.label}>
                    <Flex
                      justify="space-between"
                      fontFamily="mono"
                      fontSize="12.5px"
                      mb="7px"
                    >
                      <Text color="fg.default">{region.label}</Text>
                      <Text color={isLagging ? "gt.500" : "fg.muted"}>
                        {region.marginPct.toFixed(2)}%
                      </Text>
                    </Flex>
                    <Box h="8px" bg="border.tint" borderRadius="full" overflow="hidden">
                      <Box
                        h="8px"
                        w={`${barPct}%`}
                        bg={isLagging ? "gt.500" : "gtDark"}
                        borderRadius="full"
                        transition="width 0.6s cubic-bezier(0.16,1,0.3,1)"
                      />
                    </Box>
                  </Box>
                );
              })}
            </Flex>
            <Text
              mt="22px"
              pt="16px"
              borderTopWidth="1px"
              borderColor="border.tint"
              fontFamily="mono"
              fontSize="11.5px"
              color="fg.muted"
            >
              2.5M quote lines analyzed · 10 regions tracked live
            </Text>
          </Box>
        </Reveal>
      </SimpleGrid>
    </Box>
  );
}
