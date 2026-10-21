"use client";

import { Box, Flex, Text } from "@chakra-ui/react";

import { Reveal } from "@/components/motion/reveal";

export function QuoteSection() {
  return (
    <Box
      as="section"
      maxW="1180px"
      mx="auto"
      px={{ base: "20px", md: "48px" }}
      py={{ base: "56px", md: "100px" }}
    >
      <Reveal>
        <Text
          as="blockquote"
          maxW="24ch"
          fontSize={{ base: "26px", md: "42px" }}
          lineHeight="1.16"
          letterSpacing="-0.035em"
          fontWeight="600"
          color="fg.default"
        >
          &ldquo;We stopped asking desks for status. The system already
          knew.&rdquo;
        </Text>
        <Flex mt="26px" align="center" gap="14px">
          <Box w="34px" h="2px" bg="gt.500" />
          <Text
            fontFamily="mono"
            fontSize="12.5px"
            letterSpacing="0.06em"
            color="fg.body"
          >
            Maya Okonkwo · VP Commercial Pricing, Ridgeline Partners
          </Text>
        </Flex>
      </Reveal>
    </Box>
  );
}
