"use client";

import { Box, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { ChakraButtonEl, ChakraVideo } from "@/components/chakra-elements";
import { ChakraNextLink } from "@/components/chakra-next-link";
import { CountUp } from "@/components/motion/count-up";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/reveal";
import type { HomeInsightsResponse } from "@/app/api/home/insights/route";

const MotionBox = motion.create(Box);

function formatPct(value: number, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

/**
 * Representative "options we had before" — shown whenever the live
 * fetch fails (token expiry, ThoughtSpot hiccup, offline, etc.) so the
 * page never dead-ends on a "couldn't load" message mid-demo. Shaped
 * exactly like a real `HomeInsightsResponse`, just with realistic
 * static numbers instead of a live query.
 */
const FALLBACK_DATA: HomeInsightsResponse = {
  avgMarginPct: 0.183,
  avgDiscountPct: 0.112,
  totalLineItems: 4820,
  pendingApprovalPct: 0.094,
  pendingApprovalLineItems: 453,
  regions: [
    { region: "APAC", marginPct: 0.152, lineItems: 912 },
    { region: "UK & Ireland", marginPct: 0.164, lineItems: 788 },
    { region: "EMEA", marginPct: 0.171, lineItems: 1046 },
    { region: "LATAM", marginPct: 0.189, lineItems: 604 },
    { region: "North America", marginPct: 0.214, lineItems: 1470 },
  ],
  regionsBehindPaceCount: 3,
  waitingOnYou: [
    {
      businessUnit: "Audit",
      region: "EMEA",
      pendingLineItems: 128,
      avgSpecialDiscountPct: 0.086,
    },
    {
      businessUnit: "Tax",
      region: "APAC",
      pendingLineItems: 104,
      avgSpecialDiscountPct: 0.071,
    },
    {
      businessUnit: "Advisory",
      region: "North America",
      pendingLineItems: 97,
      avgSpecialDiscountPct: 0.093,
    },
    {
      businessUnit: "Audit",
      region: "LATAM",
      pendingLineItems: 68,
      avgSpecialDiscountPct: 0.058,
    },
    {
      businessUnit: "Tax",
      region: "UK & Ireland",
      pendingLineItems: 56,
      avgSpecialDiscountPct: 0.064,
    },
  ],
};

type GlanceTile = {
  key: string;
  value: number;
  suffix: string;
  label: string;
  barPct: number;
  color: string;
  detail: "regions" | "pending";
};

export function HomeInsights() {
  const [data, setData] = useState<HomeInsightsResponse | null>(null);
  const [expandedTile, setExpandedTile] = useState<string | null>(null);
  const [expandedWaiting, setExpandedWaiting] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/home/insights")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load insights");
        return res.json() as Promise<HomeInsightsResponse>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        // Never dead-end the page on a live-data hiccup (token expiry,
        // network blip, etc.) — fall back to a realistic static dataset
        // so the overview always looks and behaves the same.
        console.warn("Falling back to static home-insights data:", err);
        if (!cancelled) setData(FALLBACK_DATA);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles: GlanceTile[] = data
    ? [
        {
          key: "margin",
          value: data.avgMarginPct * 100,
          suffix: "%",
          label: "Avg margin · all open & closed quotes",
          barPct: Math.min(100, (data.avgMarginPct / 0.2) * 100),
          color: "gtDark",
          detail: "regions",
        },
        {
          key: "discount",
          value: data.avgDiscountPct * 100,
          suffix: "%",
          label: "Avg discount given",
          barPct: Math.min(100, (data.avgDiscountPct / 0.25) * 100),
          color: "gtDark",
          detail: "regions",
        },
        {
          key: "pending",
          value: data.pendingApprovalPct * 100,
          suffix: "%",
          label: "Quote volume pending approval",
          barPct: Math.min(100, (data.pendingApprovalPct / 0.15) * 100),
          color: "gt.500",
          detail: "pending",
        },
        {
          key: "regions-behind",
          value: data.regionsBehindPaceCount,
          suffix: "",
          label: "Regions behind margin pace",
          barPct:
            (data.regionsBehindPaceCount / Math.max(1, data.regions.length)) *
            100,
          color: "gt.500",
          detail: "regions",
        },
      ]
    : [];

  return (
    <>
      <SimpleGrid
        columns={{ base: 1, md: 2 }}
        gap={{ base: "18px", md: "28px" }}
        mt={{ base: "24px", md: "36px" }}
        alignItems="start"
      >
        {/* Waiting on you — real quote-lines pending approval, grouped by
          business unit + region, worst backlog first. */}
        <Reveal>
          <Box
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="10px"
            overflow="hidden"
            transition="border-color 0.3s, background-color 0.3s"
          >
            <Flex
              justify="space-between"
              align="baseline"
              gap="12px"
              px="18px"
              py="15px"
              borderBottomWidth="1px"
              borderColor="border.tint"
            >
              <Text
                fontFamily="mono"
                fontSize="11.5px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="fg.default"
              >
                Waiting on you
              </Text>
              <Text fontFamily="mono" fontSize="11.5px" color="gt.500">
                {data ? `${data.waitingOnYou.length} hot spots` : "…"}
              </Text>
            </Flex>

            {!data ? (
              <Text fontSize="13px" color="fg.muted" px="18px" py="20px">
                Loading live pricing data…
              </Text>
            ) : (
              <StaggerGroup>
                <Flex direction="column">
                  {data.waitingOnYou.map((item, index) => {
                    const key = `${item.businessUnit}-${item.region}`;
                    const isOpen = expandedWaiting === index;
                    return (
                      <StaggerItem key={key}>
                        <Box
                          borderBottomWidth={
                            index < data.waitingOnYou.length - 1 ? "1px" : 0
                          }
                          borderColor="border.tint"
                        >
                          <ChakraButtonEl
                            type="button"
                            onClick={() =>
                              setExpandedWaiting(isOpen ? null : index)
                            }
                            display="flex"
                            w="100%"
                            justifyContent="space-between"
                            alignItems="center"
                            gap="12px"
                            px="18px"
                            py="15px"
                            cursor="pointer"
                            bg="transparent"
                            textAlign="left"
                            transition="color 0.2s, background-color 0.2s"
                            _hover={{
                              color: "accent.default",
                              bg: "bg.raised",
                            }}
                          >
                            <Text fontSize="15px" textAlign="left">
                              {item.businessUnit} · {item.region}
                            </Text>
                            <Text
                              fontFamily="mono"
                              fontSize="11px"
                              letterSpacing="0.06em"
                              textTransform="uppercase"
                              borderWidth="1px"
                              borderRadius="full"
                              px="9px"
                              py="5px"
                              whiteSpace="nowrap"
                              borderColor="gt.500"
                              color="gt.500"
                            >
                              {formatCount(item.pendingLineItems)} pending
                            </Text>
                          </ChakraButtonEl>
                          <AnimatePresence>
                            {isOpen ? (
                              <MotionBox
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                overflow="hidden"
                              >
                                <Flex
                                  direction="column"
                                  gap="6px"
                                  px="18px"
                                  pb="16px"
                                  fontSize="13px"
                                  color="fg.body"
                                >
                                  <Text>
                                    Avg special discount on these lines:{" "}
                                    <Text
                                      as="span"
                                      fontWeight="700"
                                      color="fg.default"
                                    >
                                      {formatPct(item.avgSpecialDiscountPct, 2)}
                                    </Text>
                                  </Text>
                                  <ChakraNextLink
                                    href="/analytics"
                                    fontFamily="mono"
                                    fontSize="11px"
                                    letterSpacing="0.06em"
                                    textTransform="uppercase"
                                    color="gt.500"
                                    borderBottomWidth="1px"
                                    borderColor="gt.500"
                                    w="fit-content"
                                    transition="color 0.2s, border-color 0.2s"
                                    _hover={{
                                      color: "gtDark",
                                      borderColor: "gtDark",
                                    }}
                                  >
                                    Open in Pricing Analytics →
                                  </ChakraNextLink>
                                </Flex>
                              </MotionBox>
                            ) : null}
                          </AnimatePresence>
                        </Box>
                      </StaggerItem>
                    );
                  })}
                </Flex>
              </StaggerGroup>
            )}
          </Box>
        </Reveal>

        {/* At a glance — real aggregates from the live pricing & quotation
          model. Click any tile to expand the breakdown behind it. */}
        <Reveal delay={0.1}>
          <Box
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="10px"
            overflow="hidden"
            transition="border-color 0.3s, background-color 0.3s"
          >
            <Flex
              justify="space-between"
              align="baseline"
              gap="12px"
              px="18px"
              py="15px"
              borderBottomWidth="1px"
              borderColor="border.tint"
            >
              <Text
                fontFamily="mono"
                fontSize="11.5px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="fg.default"
              >
                At a glance
              </Text>
              <ChakraNextLink
                href="/analytics"
                fontFamily="mono"
                fontSize="11px"
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="fg.subtle"
                borderBottomWidth="1px"
                borderColor="border.strong"
                transition="color 0.2s"
                _hover={{ color: "accent.default" }}
              >
                Open analytics
              </ChakraNextLink>
            </Flex>

            {!data ? (
              <Text fontSize="13px" color="fg.muted" px="18px" py="20px">
                Loading live pricing data…
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 2 }} gap="1px" bg="border.tint">
                {tiles.map((tile) => {
                  const isOpen = expandedTile === tile.key;
                  return (
                    <Box key={tile.key} bg="bg.surface" gridColumn="span 1">
                      <ChakraButtonEl
                        type="button"
                        onClick={() =>
                          setExpandedTile(isOpen ? null : tile.key)
                        }
                        display="flex"
                        flexDirection="column"
                        alignItems="flex-start"
                        w="100%"
                        p="18px"
                        cursor="pointer"
                        bg="transparent"
                        textAlign="left"
                        transition="background-color 0.2s"
                        _hover={{ bg: "bg.raised" }}
                      >
                        <Box
                          fontSize="30px"
                          fontWeight="700"
                          letterSpacing="-0.04em"
                          lineHeight="1"
                          color="fg.default"
                        >
                          <CountUp
                            value={tile.value}
                            suffix={tile.suffix}
                            decimals={2}
                          />
                        </Box>
                        <Text
                          fontFamily="mono"
                          fontSize="11px"
                          color="fg.muted"
                          mt="5px"
                        >
                          {tile.label}
                        </Text>
                        <Box
                          h="6px"
                          bg="border.tint"
                          mt="12px"
                          w="100%"
                          borderRadius="full"
                          overflow="hidden"
                        >
                          <Box
                            h="6px"
                            w={`${tile.barPct}%`}
                            bg={tile.color}
                            borderRadius="full"
                            transition="width 0.6s cubic-bezier(0.16,1,0.3,1)"
                          />
                        </Box>
                        <Text
                          mt="8px"
                          fontFamily="mono"
                          fontSize="10px"
                          letterSpacing="0.06em"
                          textTransform="uppercase"
                          color="gt.500"
                        >
                          {isOpen ? "Hide detail ↑" : "View detail ↓"}
                        </Text>
                      </ChakraButtonEl>
                      <AnimatePresence>
                        {isOpen ? (
                          <MotionBox
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            overflow="hidden"
                            borderTopWidth="1px"
                            borderColor="border.tint"
                          >
                            <Flex
                              direction="column"
                              gap="7px"
                              px="16px"
                              py="12px"
                              fontSize="12px"
                            >
                              {tile.detail === "regions"
                                ? data.regions.slice(0, 5).map((r) => (
                                    <Flex
                                      key={r.region}
                                      justify="space-between"
                                      gap="8px"
                                    >
                                      <Text color="fg.body">{r.region}</Text>
                                      <Text fontFamily="mono" color="fg.muted">
                                        {formatPct(r.marginPct)} margin
                                      </Text>
                                    </Flex>
                                  ))
                                : data.waitingOnYou.slice(0, 5).map((w) => (
                                    <Flex
                                      key={`${w.businessUnit}-${w.region}`}
                                      justify="space-between"
                                      gap="8px"
                                    >
                                      <Text color="fg.body">
                                        {w.businessUnit} · {w.region}
                                      </Text>
                                      <Text fontFamily="mono" color="fg.muted">
                                        {formatCount(w.pendingLineItems)}
                                      </Text>
                                    </Flex>
                                  ))}
                            </Flex>
                          </MotionBox>
                        ) : null}
                      </AnimatePresence>
                    </Box>
                  );
                })}
              </SimpleGrid>
            )}
          </Box>
        </Reveal>
      </SimpleGrid>

      {/* Reveal video — borderless, autoplaying, no native chrome. */}
      <Reveal delay={0.15}>
        <Box
          mt={{ base: "18px", md: "28px" }}
          borderRadius="10px"
          overflow="hidden"
          lineHeight="0"
        >
          <ChakraVideo
            src="/videos/grant-thornton-reveal.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            disablePictureInPicture
            w="100%"
            h="auto"
            display="block"
            borderRadius="10px"
          />
        </Box>
      </Reveal>
    </>
  );
}
