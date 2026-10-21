"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { type MouseEvent, useState } from "react";

import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";
import { toaster } from "@/components/ui/toaster";
import type { UploadedTable } from "@/stores/uploaded-tables";
import { useUploadedTablesStore } from "@/stores/uploaded-tables";

function DocIcon() {
  return (
    <ChakraSvg viewBox="0 0 24 24" w="14px" h="14px" fill="none" flexShrink={0}>
      <path
        d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </ChakraSvg>
  );
}

function TrashIcon() {
  return (
    <ChakraSvg viewBox="0 0 24 24" w="13px" h="13px" fill="none">
      <path
        d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-9 0l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ChakraSvg>
  );
}

export function UploadedTablesList({
  selectedTableName,
  onSelect,
}: {
  selectedTableName: string | null;
  onSelect: (tableName: string) => void;
}) {
  const tables = useUploadedTablesStore((s) => s.tables);
  const removeTable = useUploadedTablesStore((s) => s.removeTable);
  const [removingTable, setRemovingTable] = useState<string | null>(null);

  async function handleRemove(table: UploadedTable, e: MouseEvent) {
    e.stopPropagation();
    setRemovingTable(table.tableName);
    try {
      if (table.worksheetGuid) {
        await fetch("/api/upload-csv/register-thoughtspot", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worksheetGuid: table.worksheetGuid }),
        });
      }
      // Safe-by-default cleanup: unregisters the analytics view only,
      // leaves the Snowflake table intact (dropSnowflakeTable not sent).
      await fetch("/api/upload-csv", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: table.tableName }),
      });
      removeTable(table.tableName);
      toaster.create({
        type: "info",
        title: "Removed",
        description: `${table.tableName} is no longer in your Explore list.`,
      });
    } catch {
      toaster.create({
        type: "error",
        title: "Couldn't remove",
        description: "Something went wrong — try again.",
      });
    } finally {
      setRemovingTable(null);
    }
  }

  if (tables.length === 0) {
    return (
      <Text fontSize="12.5px" color="fg.muted" px="4px">
        No uploads yet.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="4px">
      {tables.map((table) => {
        const isActive = table.tableName === selectedTableName;
        return (
          <Box
            key={table.tableName}
            onClick={() => onSelect(table.tableName)}
            cursor="pointer"
            borderRadius="8px"
            bg={isActive ? "gt.50" : "transparent"}
            borderWidth="1px"
            borderColor={isActive ? "gt.200" : "transparent"}
            px="10px"
            py="9px"
            transition="background-color 0.15s, border-color 0.15s"
            _hover={{ bg: isActive ? "gt.50" : "bg.surface" }}
          >
            <Flex align="center" justify="space-between" gap="8px">
              <Flex align="center" gap="8px" minW={0}>
                <Box color={isActive ? "gt.500" : "fg.subtle"} flexShrink={0}>
                  <DocIcon />
                </Box>
                <Box minW={0}>
                  <Text
                    fontSize="12.5px"
                    fontWeight={isActive ? "600" : "500"}
                    color="fg.default"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    {table.fileName}
                  </Text>
                  <Text fontSize="10.5px" color="fg.subtle">
                    {table.rowCount.toLocaleString()} rows
                  </Text>
                </Box>
              </Flex>
              <ChakraButtonEl
                type="button"
                onClick={(e) => handleRemove(table, e)}
                disabled={removingTable === table.tableName}
                flexShrink={0}
                w="24px"
                h="24px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="6px"
                color="fg.subtle"
                bg="transparent"
                cursor="pointer"
                opacity={removingTable === table.tableName ? 0.4 : 1}
                transition="color 0.15s, background-color 0.15s"
                _hover={{ color: "ink.600", bg: "bg.canvas" }}
              >
                <TrashIcon />
              </ChakraButtonEl>
            </Flex>
          </Box>
        );
      })}
    </Flex>
  );
}
