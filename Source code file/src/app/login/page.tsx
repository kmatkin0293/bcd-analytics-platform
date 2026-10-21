import { Box, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";
import { ChakraNextLink } from "@/components/chakra-next-link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

const WAITING_STATS = [
  { value: "9", label: "Open quote exceptions" },
  { value: "3", label: "Margin exceptions to sign" },
  { value: "Q3'27", label: "Active engagement" },
];

export default function LoginPage() {
  return (
    <Grid
      templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
      minH="100vh"
      bg="bg.canvas"
      transition="background-color 0.3s"
      backgroundImage={{
        base:
          "radial-gradient(1100px 520px at 12% -8%, rgba(75,40,130,.08), rgba(75,40,130,0) 70%), radial-gradient(rgba(75,40,130,.07) 1px, rgba(75,40,130,0) 1.4px)",
        _dark:
          "radial-gradient(1100px 520px at 12% -8%, rgba(139,95,196,.14), rgba(139,95,196,0) 70%), radial-gradient(rgba(139,95,196,.1) 1px, rgba(139,95,196,0) 1.4px)",
      }}
      backgroundSize="100% 100%, 22px 22px"
    >
      <Flex
        direction="column"
        justify="space-between"
        gap="48px"
        px={{ base: "24px", md: "64px" }}
        py={{ base: "28px", md: "56px" }}
      >
        <ChakraNextLink href="/" display="flex" alignItems="center" gap="10px">
          <BrandMark size={32} priority />
          <Flex direction="column" lineHeight="1.1">
            <Text fontWeight="700" fontSize="15px" letterSpacing="-0.02em" color="fg.default">
              Grant Thornton
            </Text>
            <Text fontSize="10px" color="fg.muted" letterSpacing="0.04em">
              Pricing &amp; Risk Intelligence
            </Text>
          </Flex>
        </ChakraNextLink>

        <Box>
          <Heading
            as="h1"
            fontSize={{ base: "40px", md: "68px" }}
            lineHeight="0.92"
            letterSpacing="-0.05em"
            fontWeight="800"
            maxW="13ch"
            color="fg.default"
          >
            Back to the desk.
          </Heading>
          <Text
            mt="20px"
            fontSize="17px"
            lineHeight="1.55"
            color="fg.body"
            maxW="40ch"
          >
            Every action you take from here is written to the engagement audit
            trail with your name and a timestamp.
          </Text>
        </Box>

        <Box borderTopWidth="1px" borderColor="border.default" pt="20px">
          <Flex
            align="center"
            gap="9px"
            fontFamily="mono"
            fontSize="11.5px"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="gt.500"
          >
            <Box w="6px" h="6px" borderRadius="full" bg="gt.500" />
            Waiting for you
          </Flex>
          <Flex wrap="wrap" gap="28px" mt="16px">
            {WAITING_STATS.map((stat) => (
              <Box key={stat.label}>
                <Text
                  fontSize={{ base: "26px", md: "36px" }}
                  fontWeight="700"
                  letterSpacing="-0.04em"
                  lineHeight="1"
                  color="fg.default"
                >
                  {stat.value}
                </Text>
                <Text
                  fontFamily="mono"
                  fontSize="11.5px"
                  color="fg.muted"
                  mt="4px"
                >
                  {stat.label}
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>
      </Flex>

      <Flex
        bg="bg.surface"
        borderLeftWidth={{ base: 0, lg: "1px" }}
        borderTopWidth={{ base: "1px", lg: 0 }}
        borderColor="border.default"
        align="center"
        justify="center"
        px={{ base: "24px", md: "56px" }}
        py={{ base: "40px", md: "72px" }}
        transition="background-color 0.3s, border-color 0.3s"
      >
        <Box w="100%" maxW="400px">
          <Text
            fontFamily="mono"
            fontSize="11.5px"
            letterSpacing="0.14em"
            textTransform="uppercase"
            color="fg.muted"
          >
            Sign in
          </Text>
          <Heading
            as="h2"
            mt="12px"
            fontSize={{ base: "26px", md: "34px" }}
            lineHeight="1.08"
            letterSpacing="-0.035em"
            fontWeight="700"
            color="fg.default"
          >
            Username and password
          </Heading>

          <LoginForm />

          <Text
            mt="36px"
            pt="20px"
            borderTopWidth="1px"
            borderColor="border.tint"
            fontFamily="mono"
            fontSize="11px"
            lineHeight="1.7"
            letterSpacing="0.06em"
            textTransform="uppercase"
            color="fg.muted"
          >
            Access is restricted to delegated engagement staff.
            <br />
            SOC 2 Type II · ISO 27001 · GDPR
          </Text>
        </Box>
      </Flex>
    </Grid>
  );
}
