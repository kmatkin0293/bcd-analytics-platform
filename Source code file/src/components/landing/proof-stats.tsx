"use client";

import { Box, Flex, SimpleGrid, Text } from "@chakra-ui/react";

import { CountUp } from "@/components/motion/count-up";
import { StaggerGroup, StaggerItem } from "@/components/motion/reveal";

const STATS = [
  {
    value: 9,
    suffix: " days",
    note: "Median reduction in quote-to-approval time across 40 engagements.",
  },
  {
    value: 31,
    suffix: "%",
    note: "Less analyst time spent resolving and re-resolving discount overrides.",
  },
  {
    value: 0,
    suffix: "",
    note: "Critical compliance findings in customer audits since 2024.",
  },
];

export function ProofStats() {
  return (
    <Box
      as="section"
      id="proof"
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="border.default"
    >
      <StaggerGroup>
        <SimpleGrid
          columns={{ base: 1, sm: 3 }}
          gap={{ base: "28px", md: "48px" }}
          maxW="1180px"
          mx="auto"
          px={{ base: "20px", md: "48px" }}
          py={{ base: "44px", md: "76px" }}
        >
          {STATS.map((stat) => (
            <StaggerItem key={stat.note}>
              <Box>
                <Flex
                  fontSize={{ base: "40px", md: "64px" }}
                  fontWeight="800"
                  letterSpacing="-0.05em"
                  lineHeight="1"
                  color="fg.default"
                  align="baseline"
                >
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </Flex>
                <Text
                  mt="10px"
                  fontFamily="mono"
                  fontSize="12.5px"
                  lineHeight="1.5"
                  color="fg.muted"
                  maxW="26ch"
                >
                  {stat.note}
                </Text>
              </Box>
            </StaggerItem>
          ))}
        </SimpleGrid>
      </StaggerGroup>
    </Box>
  );
}
