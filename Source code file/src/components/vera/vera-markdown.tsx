"use client";

import { Box, chakra } from "@chakra-ui/react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const P = chakra("p");
const Strong = chakra("strong");
const Em = chakra("em");
const Ul = chakra("ul");
const Ol = chakra("ol");
const Li = chakra("li");
const H3 = chakra("h3");
const H4 = chakra("h4");
const H5 = chakra("h5");
const A = chakra("a");
const Code = chakra("code");
const Blockquote = chakra("blockquote");
const Table = chakra("table");
const Th = chakra("th");
const Td = chakra("td");

const components: Components = {
  p: ({ node, ref, ...props }) => <P mb="10px" _last={{ mb: 0 }} {...props} />,
  strong: ({ node, ref, ...props }) => <Strong fontWeight="700" {...props} />,
  em: ({ node, ref, ...props }) => <Em fontStyle="italic" {...props} />,
  ul: ({ node, ref, ...props }) => <Ul pl="20px" mb="10px" {...props} />,
  ol: ({ node, ref, ...props }) => <Ol pl="20px" mb="10px" {...props} />,
  li: ({ node, ref, ...props }) => <Li mb="4px" {...props} />,
  h1: ({ node, ref, ...props }) => (
    <H3 fontSize="18px" fontWeight="700" mb="8px" {...props} />
  ),
  h2: ({ node, ref, ...props }) => (
    <H4 fontSize="16px" fontWeight="700" mb="8px" {...props} />
  ),
  h3: ({ node, ref, ...props }) => (
    <H5 fontSize="15px" fontWeight="700" mb="8px" {...props} />
  ),
  a: ({ node, ref, ...props }) => (
    <A
      color="gt.500"
      textDecoration="underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ node, ref, ...props }) => (
    <Code
      bg="border.tint"
      px="4px"
      py="1px"
      borderRadius="2px"
      fontFamily="mono"
      fontSize="13px"
      {...props}
    />
  ),
  blockquote: ({ node, ref, ...props }) => (
    <Blockquote
      borderLeftWidth="2px"
      borderColor="gt.500"
      pl="12px"
      color="fg.subtle"
      mb="10px"
      {...props}
    />
  ),
  table: ({ node, ref, ...props }) => (
    <Box overflowX="auto" mb="10px">
      <Table
        w="100%"
        fontSize="13px"
        style={{ borderCollapse: "collapse" }}
        {...props}
      />
    </Box>
  ),
  th: ({ node, ref, ...props }) => (
    <Th
      textAlign="left"
      borderBottomWidth="1px"
      borderColor="border.default"
      px="8px"
      py="6px"
      fontFamily="mono"
      fontSize="11px"
      letterSpacing="0.06em"
      textTransform="uppercase"
      color="fg.muted"
      {...props}
    />
  ),
  td: ({ node, ref, ...props }) => (
    <Td
      borderBottomWidth="1px"
      borderColor="border.tint"
      px="8px"
      py="6px"
      {...props}
    />
  ),
};

export function VeraMarkdown({
  text,
  fontSize = "15px",
  lineHeight = "1.6",
  color = "fg.default",
  fontFamily,
}: {
  text: string;
  fontSize?: string;
  lineHeight?: string;
  color?: string;
  fontFamily?: string;
}) {
  return (
    <Box
      fontSize={fontSize}
      lineHeight={lineHeight}
      color={color}
      fontFamily={fontFamily}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </Box>
  );
}
