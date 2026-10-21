"use client";

import { Box, Flex, Table, Text } from "@chakra-ui/react";

import { ChakraButtonEl, ChakraInputEl } from "@/components/chakra-elements";
import { SNOWFLAKE_UPLOAD_DATABASE, SNOWFLAKE_UPLOAD_SCHEMA } from "@/config";
import type { CsvColumnType } from "@/lib/csv-schema";

const TYPE_LABEL: Record<CsvColumnType, string> = {
  integer: "INT",
  decimal: "DECIMAL",
  date: "DATE",
  boolean: "BOOL",
  string: "TEXT",
};

const TYPE_COLOR: Record<CsvColumnType, string> = {
  integer: "gt.500",
  decimal: "gt.500",
  date: "ink.600",
  boolean: "ink.600",
  string: "fg.subtle",
};

function TypeBadge({ type }: { type: CsvColumnType }) {
  return (
    <Text
      as="span"
      fontFamily="mono"
      fontSize="9.5px"
      fontWeight="700"
      letterSpacing="0.06em"
      color={TYPE_COLOR[type]}
      bg="gt.50"
      px="6px"
      py="2px"
      borderRadius="4px"
      display="inline-block"
    >
      {TYPE_LABEL[type]}
    </Text>
  );
}

export function CsvPreview({
  fileName,
  rows,
  columns,
  tableName,
  onTableNameChange,
  overwrite,
  onOverwriteChange,
  onSubmit,
  onBack,
}: {
  fileName: string;
  rows: Record<string, string>[];
  columns: { name: string; type: CsvColumnType }[];
  tableName: string;
  onTableNameChange: (value: string) => void;
  overwrite: boolean;
  onOverwriteChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const previewRows = rows.slice(0, 10);

  return (
    <Flex direction="column" gap="18px">
      <Box>
        <Text
          fontFamily="mono"
          fontSize="10.5px"
          letterSpacing="0.1em"
          textTransform="uppercase"
          color="fg.subtle"
        >
          File
        </Text>
        <Text mt="4px" fontSize="14px" fontWeight="600" color="fg.default">
          {fileName}
        </Text>
        <Text mt="2px" fontSize="12px" color="fg.muted">
          {rows.length.toLocaleString()} rows · {columns.length} columns ·
          showing first {previewRows.length}
        </Text>
      </Box>

      <Box
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="10px"
        overflow="auto"
        maxH="260px"
      >
        <Table.Root size="sm" variant="line">
          <Table.Header>
            <Table.Row>
              {columns.map((col) => (
                <Table.ColumnHeader
                  key={col.name}
                  bg="bg.surface"
                  whiteSpace="nowrap"
                  fontFamily="mono"
                  fontSize="10.5px"
                  letterSpacing="0.03em"
                  color="fg.default"
                >
                  <Flex direction="column" gap="4px" py="2px">
                    <Text as="span">{col.name}</Text>
                    <TypeBadge type={col.type} />
                  </Flex>
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {previewRows.map((row, i) => (
              <Table.Row key={`${i}-${row[columns[0]?.name ?? ""] ?? ""}`}>
                {columns.map((col) => (
                  <Table.Cell
                    key={col.name}
                    whiteSpace="nowrap"
                    fontSize="12px"
                    color="fg.body"
                  >
                    {String(row[col.name] ?? "")}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Flex direction="column" gap="6px">
        <Text
          fontFamily="mono"
          fontSize="10.5px"
          letterSpacing="0.1em"
          textTransform="uppercase"
          color="fg.subtle"
        >
          Table name
        </Text>
        <ChakraInputEl
          value={tableName}
          onChange={(e) => onTableNameChange(e.currentTarget.value)}
          borderWidth="1px"
          borderColor="border.strong"
          borderRadius="8px"
          px="12px"
          py="10px"
          fontFamily="mono"
          fontSize="13px"
          color="fg.default"
          bg="bg.canvas"
          _focus={{ borderColor: "gt.400", outline: "none" }}
        />
      </Flex>

      <Flex align="center" justify="space-between">
        <Box>
          <Text
            fontFamily="mono"
            fontSize="10.5px"
            letterSpacing="0.1em"
            textTransform="uppercase"
            color="fg.subtle"
          >
            Destination
          </Text>
          <Text mt="4px" fontFamily="mono" fontSize="12.5px" color="fg.body">
            {SNOWFLAKE_UPLOAD_DATABASE}.{SNOWFLAKE_UPLOAD_SCHEMA}
          </Text>
        </Box>

        <Flex align="center" gap="8px">
          <ChakraButtonEl
            type="button"
            onClick={() => onOverwriteChange(true)}
            px="12px"
            py="7px"
            borderRadius="7px"
            borderWidth="1px"
            borderColor={overwrite ? "gt.500" : "border.strong"}
            bg={overwrite ? "gt.500" : "transparent"}
            color={overwrite ? "white" : "fg.subtle"}
            fontFamily="mono"
            fontSize="11px"
            fontWeight="700"
            letterSpacing="0.04em"
            textTransform="uppercase"
            cursor="pointer"
            transition="all 0.15s"
          >
            Overwrite
          </ChakraButtonEl>
          <ChakraButtonEl
            type="button"
            onClick={() => onOverwriteChange(false)}
            px="12px"
            py="7px"
            borderRadius="7px"
            borderWidth="1px"
            borderColor={!overwrite ? "gt.500" : "border.strong"}
            bg={!overwrite ? "gt.500" : "transparent"}
            color={!overwrite ? "white" : "fg.subtle"}
            fontFamily="mono"
            fontSize="11px"
            fontWeight="700"
            letterSpacing="0.04em"
            textTransform="uppercase"
            cursor="pointer"
            transition="all 0.15s"
          >
            Append
          </ChakraButtonEl>
        </Flex>
      </Flex>

      <Flex gap="10px" mt="6px">
        <ChakraButtonEl
          type="button"
          onClick={onBack}
          px="16px"
          py="12px"
          borderRadius="9px"
          bg="transparent"
          color="fg.subtle"
          fontFamily="mono"
          fontSize="11.5px"
          letterSpacing="0.06em"
          textTransform="uppercase"
          cursor="pointer"
          transition="color 0.2s"
          _hover={{ color: "fg.default" }}
        >
          Back
        </ChakraButtonEl>
        <ChakraButtonEl
          type="button"
          onClick={onSubmit}
          flex="1"
          disabled={!tableName.trim()}
          display="flex"
          alignItems="center"
          justifyContent="center"
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
          opacity={!tableName.trim() ? 0.5 : 1}
          transition="background-color 0.2s, transform 0.15s, box-shadow 0.2s"
          _hover={{
            bg: "gtDark",
            boxShadow: "0 10px 28px -8px rgba(75,40,130,0.5)",
          }}
          _active={{ transform: "scale(0.97)" }}
        >
          Upload to Snowflake
        </ChakraButtonEl>
      </Flex>
    </Flex>
  );
}
