"use client";

import { Box, Flex, Heading, Text } from "@chakra-ui/react";

import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/reveal";

const URGENT_ISSUES = [
  "Europe desk · 14 quotes awaiting margin sign-off",
  "GDPR requirement · unreported 6d",
  "Special discount override · pending finance",
  "South East Asia region · approvals stalled 21d",
  "Vendor contract · renewal risk flagged",
];

const BACKLOG_ISSUES = [
  "M&A diligence · pending partner sign-off",
  "Evidence library · 412 documents unfiled",
  "Compliance review · overdue 9d",
  "Non-compliant requirement rate · up 18% week over week",
  "Business unit · two reviewers without delegation",
];

function IssueChip({ label, dotColor, index }: { label: string; dotColor: string; index: number }) {
  return (
    <StaggerItem>
      <Flex
        align="center"
        gap="10px"
        borderWidth="1px"
        borderColor="sidebarBorder"
        bg="sidebarSurface"
        px="18px"
        py="13px"
        borderRadius="7px"
        fontFamily="mono"
        fontSize="13px"
        color="#CBD3DF"
        whiteSpace="nowrap"
        transition="border-color 0.2s, transform 0.2s"
        _hover={{ borderColor: "gt.400", transform: "translateY(-2px)" }}
        style={{ transitionDelay: `${index * 15}ms` }}
      >
        <Box w="6px" h="6px" borderRadius="full" bg={dotColor} flexShrink={0} />
        {label}
      </Flex>
    </StaggerItem>
  );
}

export function IssueChips() {
  return (
    <Box
      as="section"
      bg="sidebarInk"
      color="sidebarText"
      py={{ base: "56px", md: "92px" }}
    >
      <Reveal>
        <Box maxW="1180px" mx="auto" px={{ base: "20px", md: "48px" }}>
          <Heading
            as="h2"
            fontSize={{ base: "30px", md: "50px" }}
            lineHeight="1.02"
            letterSpacing="-0.04em"
            fontWeight="700"
            maxW="26ch"
          >
            The alternative is fourteen spreadsheets and a Friday-night email thread.
          </Heading>
          <Text
            mt="18px"
            fontSize={{ base: "16px", md: "18px" }}
            lineHeight="1.55"
            color="sidebarMuted"
            maxW="52ch"
          >
            Everything below was surfaced by a desk or reviewer in the last hour.
            In most legacy setups, none of it reaches leadership until the next
            quarterly review.
          </Text>
        </Box>
      </Reveal>

      <StaggerGroup>
        <Flex
          maxW="1180px"
          mx="auto"
          px={{ base: "20px", md: "48px" }}
          mt={{ base: "34px", md: "54px" }}
          wrap="wrap"
          gap="14px"
        >
          {URGENT_ISSUES.map((label, i) => (
            <IssueChip key={label} label={label} dotColor="gt.500" index={i} />
          ))}
        </Flex>
      </StaggerGroup>
      <StaggerGroup>
        <Flex
          maxW="1180px"
          mx="auto"
          px={{ base: "20px", md: "48px" }}
          mt="14px"
          wrap="wrap"
          gap="14px"
        >
          {BACKLOG_ISSUES.map((label, i) => (
            <IssueChip key={label} label={label} dotColor="sidebarSubtle" index={i} />
          ))}
        </Flex>
      </StaggerGroup>
    </Box>
  );
}
