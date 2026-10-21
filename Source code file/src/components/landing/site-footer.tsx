"use client";

import { Box, Flex, Text } from "@chakra-ui/react";

import { BrandMark } from "@/components/brand-mark";
import { ChakraA } from "@/components/chakra-elements";

const FOOTER_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#flow", label: "Pricing Intelligence" },
  { href: "#proof", label: "Results" },
  { href: "#demo", label: "Contact" },
];

export function SiteFooter() {
  return (
    <Box
      as="footer"
      px={{ base: "20px", md: "48px" }}
      py={{ base: "40px", md: "64px" }}
      borderTopWidth="1px"
      borderColor="border.default"
    >
      <Flex
        maxW="1180px"
        mx="auto"
        wrap="wrap"
        gap="32px"
        align="baseline"
        justify="space-between"
      >
        <Flex align="center" gap="10px">
          <BrandMark size={28} />
          <Flex direction="column" lineHeight="1.1">
            <Text fontWeight="700" fontSize="15px" letterSpacing="-0.02em" color="fg.default">
              Grant Thornton
            </Text>
            <Text fontSize="10px" color="fg.muted" letterSpacing="0.04em">
              Pricing &amp; Risk Intelligence
            </Text>
          </Flex>
        </Flex>
        <Flex wrap="wrap" gap="24px">
          {FOOTER_LINKS.map((link) => (
            <ChakraA
              key={link.href}
              href={link.href}
              fontSize="13px"
              fontWeight="500"
              color="fg.subtle"
              transition="color 0.2s"
              _hover={{ color: "accent.default" }}
            >
              {link.label}
            </ChakraA>
          ))}
        </Flex>
        <Text fontSize="11.5px" color="fg.muted" maxW="38ch">
          © 2026 Grant Thornton. This is a demonstration application. Data shown is illustrative.
        </Text>
      </Flex>
    </Box>
  );
}
