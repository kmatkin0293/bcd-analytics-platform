"use client";

import { Box, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";

import { BrandLogo } from "@/components/brand-mark";
import { ChakraA } from "@/components/chakra-elements";
import { PulseDot } from "@/components/motion/reveal";

export function Hero() {
  return (
    <Box
      as="section"
      id="top"
      position="relative"
      maxW="1180px"
      mx="auto"
      px={{ base: "20px", md: "48px" }}
      pt={{ base: "56px", md: "104px" }}
      pb={{ base: "28px", md: "44px" }}
      overflow="hidden"
    >
      {/* Ambient aurora backdrop — purely decorative, sits behind all content */}
      <Box position="absolute" inset={0} zIndex={0} pointerEvents="none" overflow="hidden">
        <Box
          position="absolute"
          top="-120px"
          left="-80px"
          w="520px"
          h="520px"
          borderRadius="full"
          filter="blur(90px)"
          opacity={{ base: 0.35, _dark: 0.5 }}
          bg="radial-gradient(circle, rgba(75,40,130,0.5), rgba(75,40,130,0) 70%)"
          animation="aurora 16s ease-in-out infinite"
        />
        <Box
          position="absolute"
          top="60px"
          right="-120px"
          w="460px"
          h="460px"
          borderRadius="full"
          filter="blur(100px)"
          opacity={{ base: 0.25, _dark: 0.4 }}
          bg="radial-gradient(circle, rgba(139,95,196,0.45), rgba(139,95,196,0) 70%)"
          animation="aurora 20s ease-in-out infinite reverse"
        />
      </Box>

      <Box position="relative" zIndex={1}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          display="inline-flex"
          alignItems="center"
          bg="white"
          borderRadius="8px"
          px="14px"
          py="8px"
          boxShadow="0 6px 20px -8px rgba(75,40,130,0.25)"
        >
          <BrandLogo width={128} priority />
        </Box>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        <Flex align="center" gap="12px" mt="22px">
          <PulseDot color="#4B2882" />
          <Text
            fontSize="12.5px"
            fontWeight="600"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="fg.muted"
          >
            Pricing · Governance · Compliance · Live across every region
          </Text>
        </Flex>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <Heading
          as="h1"
          mt="22px"
          fontSize={{ base: "46px", md: "80px", lg: "100px" }}
          lineHeight="0.92"
          letterSpacing="-0.04em"
          fontWeight="800"
          maxW="16ch"
          color="fg.default"
        >
          Every quote, every margin, every market — one record.
        </Heading>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <SimpleGrid
          columns={{ base: 1, md: 2 }}
          gap={{ base: "24px", md: "56px" }}
          mt={{ base: "28px", md: "44px" }}
          alignItems="end"
        >
          <Text
            fontSize={{ base: "17px", md: "20px" }}
            lineHeight="1.5"
            color="fg.body"
            maxW="46ch"
          >
            Grant Thornton's pricing and risk platform gives commercial, compliance,
            and deal teams real-time visibility across every region, quote, and
            regulation — so exposure surfaces before it becomes a write-down.
          </Text>
          <Flex wrap="wrap" gap="12px">
            <ChakraA
              href="#demo"
              bg="gt.500"
              color="white"
              px="24px"
              py="16px"
              fontSize="13px"
              fontWeight="600"
              letterSpacing="0.04em"
              textTransform="uppercase"
              borderRadius="6px"
              transition="background-color 0.2s, transform 0.2s, box-shadow 0.2s"
              _hover={{ bg: "gt.600", boxShadow: "0 10px 28px -8px rgba(75,40,130,0.5)" }}
              _active={{ transform: "scale(0.97)" }}
            >
              Book a walkthrough
            </ChakraA>
            <ChakraA
              href="#platform"
              borderWidth="1px"
              borderColor="border.strong"
              color="fg.default"
              px="24px"
              py="16px"
              fontSize="13px"
              fontWeight="600"
              letterSpacing="0.04em"
              textTransform="uppercase"
              borderRadius="6px"
              transition="background-color 0.2s, color 0.2s, border-color 0.2s"
              _hover={{ bg: "fg.default", color: "bg.canvas", borderColor: "fg.default" }}
            >
              See the platform ↓
            </ChakraA>
          </Flex>
        </SimpleGrid>
      </motion.div>
      </Box>
    </Box>
  );
}
