"use client";

import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { LockIcon } from "@/components/agents/agent-icons";
import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";
import { CsvExplorer } from "@/components/csv-explorer/csv-explorer";
import { UploadedTablesList } from "@/components/csv-explorer/uploaded-tables-list";
import { UploadButton } from "@/components/csv-upload/upload-button";
import { usePlanStore } from "@/stores/plan";
import { useUploadedTablesStore } from "@/stores/uploaded-tables";

function LockedState() {
  const openUpgradeDialog = usePlanStore((s) => s.openUpgradeDialog);
  return (
    <Flex
      align="center"
      justify="center"
      minH="500px"
      direction="column"
      gap="14px"
      textAlign="center"
    >
      <Flex
        align="center"
        justify="center"
        w="52px"
        h="52px"
        borderRadius="full"
        bg="gt.50"
        color="gt.500"
      >
        <LockIcon />
      </Flex>
      <Box>
        <Text fontSize="16px" fontWeight="700" color="fg.default">
          Explore Uploads is Premium
        </Text>
        <Text mt="6px" fontSize="13px" color="fg.muted" maxW="42ch">
          Upload your own data and ask it questions alongside the main dataset —
          upgrade to unlock it.
        </Text>
      </Box>
      <ChakraButtonEl
        type="button"
        onClick={openUpgradeDialog}
        px="18px"
        py="12px"
        borderRadius="9px"
        bg="gt.500"
        color="white"
        fontFamily="mono"
        fontSize="12px"
        fontWeight="700"
        letterSpacing="0.06em"
        textTransform="uppercase"
        cursor="pointer"
        transition="background-color 0.2s"
        _hover={{ bg: "gtDark" }}
      >
        Upgrade to Premium
      </ChakraButtonEl>
    </Flex>
  );
}

function EmptyState() {
  return (
    <Flex
      align="center"
      justify="center"
      minH="500px"
      direction="column"
      gap="14px"
      textAlign="center"
    >
      <Flex
        align="center"
        justify="center"
        w="52px"
        h="52px"
        borderRadius="full"
        bg="gt.50"
        color="gt.500"
      >
        <ChakraSvg viewBox="0 0 24 24" w="24px" h="24px" fill="none">
          <path
            d="M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5M5 16.5V19a2 2 0 002 2h10a2 2 0 002-2v-2.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </ChakraSvg>
      </Flex>
      <Box>
        <Text fontSize="16px" fontWeight="700" color="fg.default">
          Nothing uploaded yet
        </Text>
        <Text mt="6px" fontSize="13px" color="fg.muted" maxW="42ch">
          Upload a CSV from the sidebar to start exploring it here.
        </Text>
      </Box>
      <UploadButton />
    </Flex>
  );
}

export function ExploreShell() {
  const plan = usePlanStore((s) => s.plan);
  const isPremium = plan === "premium";
  const tables = useUploadedTablesStore((s) => s.tables);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTable = searchParams.get("table");

  const [selectedTableName, setSelectedTableName] = useState<string | null>(
    null,
  );
  const [combineWithMain, setCombineWithMain] = useState(false);

  useEffect(() => {
    if (requestedTable && tables.some((t) => t.tableName === requestedTable)) {
      setSelectedTableName(requestedTable);
    } else if (!selectedTableName && tables.length > 0) {
      setSelectedTableName(tables[0].tableName);
    } else if (
      selectedTableName &&
      !tables.some((t) => t.tableName === selectedTableName)
    ) {
      setSelectedTableName(tables[0]?.tableName ?? null);
    }
  }, [requestedTable, tables, selectedTableName]);

  if (!isPremium) return <LockedState />;
  if (tables.length === 0) return <EmptyState />;

  const selectedTable =
    tables.find((t) => t.tableName === selectedTableName) ?? tables[0];

  return (
    <Flex gap="28px" align="flex-start" wrap={{ base: "wrap", lg: "nowrap" }}>
      <Box
        flex={{ base: "1 1 100%", lg: "0 0 260px" }}
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="12px"
        bg="bg.surface"
        p="14px"
      >
        <Flex align="center" justify="space-between" pb="10px">
          <Heading
            as="h3"
            fontSize="12px"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="fg.subtle"
          >
            Your uploads
          </Heading>
        </Flex>
        <UploadedTablesList
          selectedTableName={selectedTable?.tableName ?? null}
          onSelect={(tableName) => {
            setSelectedTableName(tableName);
            router.replace(`/explore?table=${encodeURIComponent(tableName)}`);
          }}
        />
      </Box>

      <Box
        flex="1"
        minW={0}
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="12px"
        bg="bg.surface"
        p="18px"
      >
        {selectedTable ? (
          <CsvExplorer
            table={selectedTable}
            combineWithMain={combineWithMain}
            onCombineWithMainChange={setCombineWithMain}
          />
        ) : null}
      </Box>
    </Flex>
  );
}
