"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";

import { ChakraInputEl, ChakraSvg } from "@/components/chakra-elements";
import { CSV_UPLOAD_MAX_BYTES } from "@/config";

function UploadIcon() {
  return (
    <ChakraSvg viewBox="0 0 24 24" w="28px" h="28px" fill="none">
      <path
        d="M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5M5 16.5V19a2 2 0 002 2h10a2 2 0 002-2v-2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ChakraSvg>
  );
}

export function DropZone({
  onFile,
  errorMessage,
}: {
  onFile: (file: File) => void;
  errorMessage: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) return;
    onFile(file);
  }

  return (
    <Box>
      <Box
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        cursor="pointer"
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={dragging ? "gt.400" : "border.strong"}
        borderRadius="12px"
        bg={dragging ? "gt.50" : "bg.surface"}
        px="24px"
        py="48px"
        textAlign="center"
        transition="border-color 0.2s, background-color 0.2s"
        _hover={{ borderColor: "gt.400", bg: "gt.50" }}
      >
        <Flex direction="column" align="center" gap="14px">
          <Flex
            align="center"
            justify="center"
            w="52px"
            h="52px"
            borderRadius="full"
            bg="gt.50"
            color="gt.500"
          >
            <UploadIcon />
          </Flex>
          <Box>
            <Text fontSize="15px" fontWeight="600" color="fg.default">
              Drop a CSV file here
            </Text>
            <Text mt="4px" fontSize="13px" color="fg.muted">
              or click to browse — up to 50 MB
            </Text>
          </Box>
        </Flex>
        <ChakraInputEl
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          display="none"
          onChange={(e) => handleFiles(e.currentTarget.files)}
        />
      </Box>
      {errorMessage ? (
        <Text mt="10px" fontSize="12.5px" color="ink.600">
          {errorMessage}
        </Text>
      ) : null}
      <Text mt="10px" fontFamily="mono" fontSize="10.5px" color="fg.subtle">
        Max file size: {Math.round(CSV_UPLOAD_MAX_BYTES / (1024 * 1024))} MB ·
        .csv only
      </Text>
    </Box>
  );
}
