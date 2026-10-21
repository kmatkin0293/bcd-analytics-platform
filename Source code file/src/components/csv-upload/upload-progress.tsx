"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";

import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";

const MotionBox = motion.create(Box);

export type UploadStage =
  | "uploading"
  | "creating"
  | "registering"
  | "done"
  | "error";

const STAGES: { key: Exclude<UploadStage, "error">; label: string }[] = [
  { key: "uploading", label: "Uploading to Snowflake…" },
  { key: "creating", label: "Creating table…" },
  { key: "registering", label: "Registering with analytics engine…" },
  { key: "done", label: "Done" },
];

function stageIndex(stage: UploadStage): number {
  if (stage === "error") return STAGES.length - 1;
  return STAGES.findIndex((s) => s.key === stage);
}

function CheckIcon() {
  return (
    <ChakraSvg viewBox="0 0 24 24" w="13px" h="13px" fill="none">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ChakraSvg>
  );
}

export function UploadProgress({
  stage,
  errorMessage,
  resultSummary,
  onAskQuestions,
  onUploadAnother,
  onClose,
}: {
  stage: UploadStage;
  errorMessage: string | null;
  resultSummary: { tableName: string; rowCount: number } | null;
  onAskQuestions: () => void;
  onUploadAnother: () => void;
  onClose: () => void;
}) {
  const activeIndex = stageIndex(stage);

  return (
    <Flex direction="column" gap="24px" py="10px">
      <Flex direction="column" gap="16px">
        {STAGES.map((s, i) => {
          const isActive =
            stage !== "error" && stage !== "done" && i === activeIndex;
          const isComplete = stage === "done" || i < activeIndex;

          return (
            <Flex key={s.key} align="center" gap="12px">
              <Flex
                flexShrink={0}
                align="center"
                justify="center"
                w="26px"
                h="26px"
                borderRadius="full"
                borderWidth="1.5px"
                borderColor={
                  isComplete ? "gt.500" : isActive ? "gt.400" : "border.strong"
                }
                bg={isComplete ? "gt.500" : "transparent"}
                color={isComplete ? "white" : "fg.subtle"}
                position="relative"
              >
                {isComplete ? (
                  <CheckIcon />
                ) : isActive ? (
                  <MotionBox
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="gt.400"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ) : (
                  <Text fontSize="10px" fontFamily="mono">
                    {i + 1}
                  </Text>
                )}
              </Flex>
              <Text
                fontSize="13.5px"
                fontWeight={isActive ? "600" : "400"}
                color={
                  isComplete
                    ? "fg.default"
                    : isActive
                      ? "fg.default"
                      : "fg.subtle"
                }
              >
                {s.label}
              </Text>
            </Flex>
          );
        })}
      </Flex>

      {stage === "error" ? (
        <Box
          borderWidth="1px"
          borderColor="border.strong"
          borderRadius="10px"
          bg="bg.surface"
          p="14px"
        >
          <Text
            fontFamily="mono"
            fontSize="10.5px"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="ink.600"
          >
            Upload failed
          </Text>
          <Text mt="6px" fontSize="12.5px" color="fg.body">
            {errorMessage ?? "Something went wrong."}
          </Text>
        </Box>
      ) : null}

      {stage === "done" && resultSummary ? (
        <Box
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="10px"
          bg="bg.surface"
          p="14px"
        >
          <Text
            fontFamily="mono"
            fontSize="10.5px"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="fg.subtle"
          >
            Ready
          </Text>
          <Text mt="6px" fontSize="13px" color="fg.default" fontWeight="600">
            {resultSummary.tableName}
          </Text>
          <Text mt="2px" fontSize="12px" color="fg.muted">
            {resultSummary.rowCount.toLocaleString()} rows uploaded
          </Text>
        </Box>
      ) : null}

      <Flex gap="10px">
        {stage === "error" ? (
          <ChakraButtonEl
            type="button"
            onClick={onUploadAnother}
            flex="1"
            px="18px"
            py="13px"
            borderRadius="9px"
            bg="gt.500"
            color="white"
            fontFamily="mono"
            fontSize="12.5px"
            fontWeight="700"
            letterSpacing="0.06em"
            textTransform="uppercase"
            cursor="pointer"
            transition="background-color 0.2s"
            _hover={{ bg: "gtDark" }}
          >
            Try again
          </ChakraButtonEl>
        ) : null}
        {stage === "done" ? (
          <>
            <ChakraButtonEl
              type="button"
              onClick={onUploadAnother}
              px="16px"
              py="13px"
              borderRadius="9px"
              bg="transparent"
              borderWidth="1px"
              borderColor="border.strong"
              color="fg.subtle"
              fontFamily="mono"
              fontSize="11.5px"
              letterSpacing="0.06em"
              textTransform="uppercase"
              cursor="pointer"
              transition="border-color 0.2s, color 0.2s"
              _hover={{ borderColor: "fg.default", color: "fg.default" }}
            >
              Upload another
            </ChakraButtonEl>
            <ChakraButtonEl
              type="button"
              onClick={onAskQuestions}
              flex="1"
              px="18px"
              py="13px"
              borderRadius="9px"
              bg="gt.500"
              color="white"
              fontFamily="mono"
              fontSize="12.5px"
              fontWeight="700"
              letterSpacing="0.06em"
              textTransform="uppercase"
              cursor="pointer"
              transition="background-color 0.2s, box-shadow 0.2s"
              _hover={{
                bg: "gtDark",
                boxShadow: "0 10px 28px -8px rgba(75,40,130,0.5)",
              }}
            >
              Ask questions
            </ChakraButtonEl>
          </>
        ) : null}
        {stage !== "error" && stage !== "done" ? (
          <ChakraButtonEl
            type="button"
            onClick={onClose}
            flex="1"
            px="18px"
            py="13px"
            borderRadius="9px"
            bg="transparent"
            borderWidth="1px"
            borderColor="border.strong"
            color="fg.subtle"
            fontFamily="mono"
            fontSize="11.5px"
            letterSpacing="0.06em"
            textTransform="uppercase"
            cursor="not-allowed"
            opacity={0.6}
            disabled
          >
            Working…
          </ChakraButtonEl>
        ) : null}
      </Flex>
    </Flex>
  );
}
