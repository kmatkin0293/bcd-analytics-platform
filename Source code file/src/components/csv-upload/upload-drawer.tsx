"use client";

import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import Papa from "papaparse";
import { useEffect, useState } from "react";
import type {
  RegisterThoughtSpotErrorResponse,
  RegisterThoughtSpotResponse,
} from "@/app/api/upload-csv/register-thoughtspot/route";
import type {
  UploadCsvErrorResponse,
  UploadCsvResponse,
} from "@/app/api/upload-csv/route";
import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";
import { CsvPreview } from "@/components/csv-upload/csv-preview";
import { DropZone } from "@/components/csv-upload/drop-zone";
import {
  UploadProgress,
  type UploadStage,
} from "@/components/csv-upload/upload-progress";
import { Portal } from "@/components/motion/portal";
import { toaster } from "@/components/ui/toaster";
import { CSV_UPLOAD_MAX_BYTES, SNOWFLAKE_UPLOAD_TABLE_PREFIX } from "@/config";
import {
  type CsvColumnType,
  inferColumnTypes,
  sanitizeTableName,
} from "@/lib/csv-schema";
import { useUploadedTablesStore } from "@/stores/uploaded-tables";

const MotionBox = motion.create(Box);

type Step = "drop" | "preview" | "progress";

type ParsedCsv = {
  file: File;
  rows: Record<string, string>[];
  columns: { name: string; type: CsvColumnType }[];
};

function CloseIcon() {
  return (
    <ChakraSvg viewBox="0 0 24 24" w="16px" h="16px" fill="none">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </ChakraSvg>
  );
}

export function UploadDrawer({
  onClose,
  onAskQuestions,
}: {
  onClose: () => void;
  onAskQuestions: (tableName: string) => void;
}) {
  const [step, setStep] = useState<Step>("drop");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [tableName, setTableName] = useState("");
  const [overwrite, setOverwrite] = useState(true);
  const [dropError, setDropError] = useState<string | null>(null);
  const [stage, setStage] = useState<UploadStage>("uploading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<{
    tableName: string;
    rowCount: number;
  } | null>(null);

  const addTable = useUploadedTablesStore((s) => s.addTable);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleFile(file: File) {
    setDropError(null);
    if (file.size > CSV_UPLOAD_MAX_BYTES) {
      setDropError("File exceeds the 50 MB limit.");
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const columnsRaw = result.meta.fields ?? [];
        if (columnsRaw.length === 0) {
          setDropError("Couldn't find any columns in that file.");
          return;
        }
        const rows = result.data;
        const columns = inferColumnTypes(columnsRaw, rows);
        setParsed({ file, rows, columns });
        setTableName(
          sanitizeTableName(file.name, SNOWFLAKE_UPLOAD_TABLE_PREFIX),
        );
        setStep("preview");
      },
      error: () => setDropError("Couldn't parse that file as CSV."),
    });
  }

  function reset() {
    setStep("drop");
    setParsed(null);
    setTableName("");
    setDropError(null);
    setErrorMessage(null);
    setResultSummary(null);
  }

  async function handleSubmit() {
    if (!parsed) return;
    setStep("progress");
    setStage("uploading");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", parsed.file);
      formData.append("tableName", tableName);
      formData.append("overwrite", String(overwrite));

      const uploadRes = await fetch("/api/upload-csv", {
        method: "POST",
        body: formData,
      });
      const uploadJson = (await uploadRes.json()) as
        | UploadCsvResponse
        | UploadCsvErrorResponse;
      if (!uploadJson.success) {
        throw new Error(uploadJson.error);
      }

      setStage("registering");
      let registerJson: RegisterThoughtSpotResponse | RegisterThoughtSpotErrorResponse;
      try {
        const registerRes = await fetch("/api/upload-csv/register-thoughtspot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(90_000),
          body: JSON.stringify({
            tableName: uploadJson.tableName,
            fileName: uploadJson.fileName,
            columns: parsed.columns.map((col, i) => ({
              dbName: uploadJson.columns[i],
              displayName: col.name,
              type: col.type,
            })),
          }),
        });
        registerJson = await registerRes.json();
      } catch {
        registerJson = {
          success: false,
          error: "Registering the table timed out. Your data is safe in Snowflake.",
        };
      }

      const worksheetGuid = registerJson.success
        ? registerJson.worksheetGuid
        : null;

      addTable({
        tableName: uploadJson.tableName,
        worksheetGuid,
        fileName: uploadJson.fileName,
        uploadedAt: new Date().toISOString(),
        rowCount: uploadJson.rowCount,
        columns: uploadJson.columns,
      });

      setResultSummary({
        tableName: uploadJson.tableName,
        rowCount: uploadJson.rowCount,
      });
      setStage("done");

      if (registerJson.success) {
        toaster.create({
          type: "success",
          title: "Upload complete",
          description: `${uploadJson.tableName} is ready to explore.`,
        });
      } else {
        toaster.create({
          type: "error",
          title: "Data uploaded, but not yet askable",
          description: registerJson.error,
        });
      }
    } catch (error) {
      setStage("error");
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
      toaster.create({
        type: "error",
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  return (
    <Portal>
      <Box position="fixed" inset={0} zIndex={95}>
        <MotionBox
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          position="absolute"
          inset={0}
          bg="rgba(20, 26, 36, 0.55)"
          backdropFilter="blur(4px)"
          onClick={onClose}
        />
        <Flex position="absolute" inset={0} justify="flex-end">
          <MotionBox
            initial={{ x: 40 }}
            animate={{ x: 0 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            w="100%"
            maxW="520px"
            h="100%"
            bg="bg.surface"
            borderLeftWidth="1px"
            borderColor="fg.default"
            overflowY="auto"
            position="relative"
            isolation="isolate"
            boxShadow="-40px 0 90px rgba(20, 26, 36, 0.3)"
          >
            <Box
              h="4px"
              bgGradient="to-r"
              gradientFrom="gt.300"
              gradientVia="gt.500"
              gradientTo="gt.700"
            />

            <Box p={{ base: "20px", md: "28px" }}>
              <Flex justify="space-between" align="center">
                <Flex align="center" gap="8px">
                  <Box w="8px" h="8px" borderRadius="full" bg="gt.500" />
                  <Text
                    fontFamily="mono"
                    fontSize="11px"
                    letterSpacing="0.14em"
                    textTransform="uppercase"
                    color="fg.muted"
                  >
                    Upload data
                  </Text>
                </Flex>
                <ChakraButtonEl
                  type="button"
                  onClick={onClose}
                  borderWidth="1px"
                  borderColor="border.strong"
                  borderRadius="7px"
                  color="fg.subtle"
                  w="28px"
                  h="28px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  bg="transparent"
                  transition="border-color 0.2s, color 0.2s, transform 0.15s"
                  _hover={{
                    borderColor: "fg.default",
                    color: "fg.default",
                    transform: "rotate(90deg)",
                  }}
                >
                  <CloseIcon />
                </ChakraButtonEl>
              </Flex>

              <Heading
                as="h2"
                mt="18px"
                fontSize="22px"
                letterSpacing="-0.025em"
                fontWeight="800"
                color="fg.default"
              >
                Bring your own data
              </Heading>
              <Text mt="6px" fontSize="13.5px" color="fg.body" maxW="42ch">
                Upload a CSV, land it in your data warehouse, and start asking
                it questions in minutes.
              </Text>

              <Box mt="26px">
                {step === "drop" ? (
                  <DropZone onFile={handleFile} errorMessage={dropError} />
                ) : null}
                {step === "preview" && parsed ? (
                  <CsvPreview
                    fileName={parsed.file.name}
                    rows={parsed.rows}
                    columns={parsed.columns}
                    tableName={tableName}
                    onTableNameChange={setTableName}
                    overwrite={overwrite}
                    onOverwriteChange={setOverwrite}
                    onSubmit={handleSubmit}
                    onBack={reset}
                  />
                ) : null}
                {step === "progress" ? (
                  <UploadProgress
                    stage={stage}
                    errorMessage={errorMessage}
                    resultSummary={resultSummary}
                    onAskQuestions={() =>
                      resultSummary && onAskQuestions(resultSummary.tableName)
                    }
                    onUploadAnother={reset}
                    onClose={onClose}
                  />
                ) : null}
              </Box>
            </Box>
          </MotionBox>
        </Flex>
      </Box>
    </Portal>
  );
}
