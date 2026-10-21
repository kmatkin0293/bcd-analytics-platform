"use client";

import { Box, Flex, SimpleGrid, Text } from "@chakra-ui/react";

import { CountUp } from "@/components/motion/count-up";
import { PulseDot, Reveal, StaggerGroup, StaggerItem } from "@/components/motion/reveal";

const STAGES = [
  {
    label: "01 · Quoted",
    value: 2840,
    note: "+64 today",
    noteColor: "gt.500",
  },
  {
    label: "02 · Reviewed",
    value: 1912,
    note: "67.3% of quoted",
    noteColor: "fg.muted",
  },
  {
    label: "03 · Approved",
    value: 1588,
    note: "83 in override",
    noteColor: "fg.muted",
  },
  {
    label: "04 · Booked",
    value: 1204,
    note: "Q3 close 18 Sep",
    noteColor: "fg.muted",
  },
];

export function CohortFlow() {
  return (
    <Box
      as="section"
      id="flow"
      maxW="1180px"
      mx="auto"
      px={{ base: "20px", md: "48px" }}
      pb={{ base: "56px", md: "96px" }}
    >
      <Reveal>
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.default" borderRadius="10px" overflow="hidden">
          <Flex
            wrap="wrap"
            gap="12px"
            align="center"
            justify="space-between"
            px="20px"
            py="14px"
            borderBottomWidth="1px"
            borderColor="border.tint"
          >
            <Text
              fontFamily="mono"
              fontSize="12px"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="fg.muted"
            >
              Global pricing desk · 38 markets · 11 business units
            </Text>
            <Flex
              align="center"
              gap="8px"
              fontFamily="mono"
              fontSize="12px"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="gt.500"
            >
              <PulseDot color="#4B2882" />
              Live
            </Flex>
          </Flex>

          <StaggerGroup>
            <SimpleGrid columns={{ base: 2, md: 4 }}>
              {STAGES.map((stage, index) => (
                <StaggerItem key={stage.label}>
                  <Box
                    px="18px"
                    py="22px"
                    borderRightWidth={{
                      base: index % 2 === 0 ? "1px" : 0,
                      md: index < STAGES.length - 1 ? "1px" : 0,
                    }}
                    borderStyle="dashed"
                    borderColor="border.tint"
                    transition="background-color 0.2s"
                    _hover={{ bg: "bg.raised" }}
                  >
                    <Text
                      fontFamily="mono"
                      fontSize="11.5px"
                      letterSpacing="0.12em"
                      textTransform="uppercase"
                      color="fg.muted"
                    >
                      {stage.label}
                    </Text>
                    <Box
                      fontSize={{ base: "28px", md: "44px" }}
                      fontWeight="700"
                      letterSpacing="-0.04em"
                      mt="8px"
                      color="fg.default"
                    >
                      <CountUp value={stage.value} />
                    </Box>
                    <Text fontFamily="mono" fontSize="11.5px" color={stage.noteColor}>
                      {stage.note}
                    </Text>
                  </Box>
                </StaggerItem>
              ))}
            </SimpleGrid>
          </StaggerGroup>

          <Flex
            justify="flex-end"
            px="18px"
            py="14px"
            borderTopWidth="1px"
            borderColor="border.tint"
          >
            <Text
              fontFamily="mono"
              fontSize="11px"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="fg.muted"
            >
              Live quote volumes, refreshed as desks report
            </Text>
          </Flex>
        </Box>
      </Reveal>
    </Box>
  );
}
