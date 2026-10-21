"use client";

import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";

import { BrandMark } from "@/components/brand-mark";
import { ChakraA } from "@/components/chakra-elements";
import { ChakraNextLink } from "@/components/chakra-next-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#flow", label: "Pricing Intelligence" },
  { href: "#proof", label: "Results" },
];

export function SiteHeader() {
  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={40}
      bg="bg.canvas"
      backdropFilter="blur(10px)"
      borderBottomWidth="1px"
      borderColor="border.default"
      transition="background-color 0.3s, border-color 0.3s"
    >
      <Flex
        maxW="1180px"
        mx="auto"
        px={{ base: "20px", md: "48px" }}
        h="68px"
        align="center"
        gap="32px"
      >
        <ChakraNextLink
          href="/"
          display="flex"
          alignItems="center"
          gap="10px"
          mr="auto"
        >
          <motion.div whileHover={{ rotate: -10, scale: 1.08 }} transition={{ duration: 0.25 }}>
            <BrandMark size={32} priority />
          </motion.div>
          <Flex direction="column" lineHeight="1.1">
            <Text fontWeight="700" fontSize="15px" letterSpacing="-0.02em" color="fg.default">
              Grant Thornton
            </Text>
            <Text fontSize="10px" color="fg.muted" letterSpacing="0.04em">
              Pricing &amp; Risk Intelligence
            </Text>
          </Flex>
        </ChakraNextLink>

        <HStack gap="28px" display={{ base: "none", md: "flex" }}>
          {NAV_LINKS.map((link) => (
            <ChakraA
              key={link.href}
              href={link.href}
              fontSize="13px"
              fontWeight="500"
              letterSpacing="0.02em"
              color="fg.subtle"
              position="relative"
              transition="color 0.2s"
              _hover={{ color: "accent.default" }}
            >
              {link.label}
            </ChakraA>
          ))}
        </HStack>

        <ThemeToggle />

        <ChakraNextLink
          href="/login"
          bg="gt.500"
          color="white"
          px="18px"
          py="11px"
          fontSize="13px"
          fontWeight="600"
          letterSpacing="0.03em"
          textTransform="uppercase"
          borderRadius="6px"
          transition="background-color 0.2s, transform 0.2s, box-shadow 0.2s"
          _hover={{ bg: "gt.600", boxShadow: "0 8px 20px -6px rgba(75,40,130,0.5)" }}
          _active={{ transform: "scale(0.97)" }}
        >
          Log in
        </ChakraNextLink>
      </Flex>
    </Box>
  );
}
