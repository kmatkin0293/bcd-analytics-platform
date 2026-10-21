"use client";

import { Box, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";

import { ChakraA } from "@/components/chakra-elements";
import { Reveal } from "@/components/motion/reveal";

export function CtaSection() {
  return (
    <Box as="section" id="demo" bg="gt.500" color="white" position="relative" overflow="hidden">
      <Box
        position="absolute"
        inset={0}
        opacity={0.5}
        backgroundImage="radial-gradient(900px 400px at 85% 0%, rgba(255,255,255,.12), rgba(255,255,255,0) 70%)"
        pointerEvents="none"
      />
      <Reveal>
        <SimpleGrid
          columns={{ base: 1, md: 2 }}
          gap={{ base: "28px", md: "56px" }}
          maxW="1180px"
          mx="auto"
          px={{ base: "20px", md: "48px" }}
          py={{ base: "56px", md: "104px" }}
          alignItems="end"
          position="relative"
        >
          <Heading
            as="h2"
            fontSize={{ base: "34px", md: "60px" }}
            lineHeight="0.98"
            letterSpacing="-0.04em"
            fontWeight="800"
            maxW="16ch"
          >
            See every quote, margin, and risk on one dashboard.
          </Heading>
          <Box>
            <Text fontSize="17px" lineHeight="1.55" color="gt.100" maxW="40ch">
              A 30-minute walkthrough with your own book of business and region
              list. No slideware, no generic demo data.
            </Text>
            <Flex wrap="wrap" gap="12px" mt="24px">
              <ChakraA
                href="#demo"
                bg="gtDark"
                color="white"
                px="24px"
                py="16px"
                fontSize="13px"
                fontWeight="600"
                letterSpacing="0.04em"
                textTransform="uppercase"
                borderRadius="6px"
                transition="background-color 0.2s, color 0.2s, transform 0.2s"
                _hover={{ bg: "white", color: "gt.500" }}
                _active={{ transform: "scale(0.97)" }}
              >
                Book a walkthrough
              </ChakraA>
              <ChakraA
                href="#platform"
                borderWidth="1px"
                borderColor="gt.200"
                color="white"
                px="24px"
                py="16px"
                fontSize="13px"
                fontWeight="600"
                letterSpacing="0.04em"
                textTransform="uppercase"
                borderRadius="6px"
                transition="background-color 0.2s, color 0.2s"
                _hover={{ bg: "white", color: "gt.500" }}
              >
                Talk to our team
              </ChakraA>
            </Flex>
            <Text
              mt="26px"
              fontSize="11.5px"
              fontWeight="600"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="gt.200"
            >
              SOC 2 Type II · ISO 27001 · GDPR · CCPA · Basel III
            </Text>
          </Box>
        </SimpleGrid>
      </Reveal>
    </Box>
  );
}
