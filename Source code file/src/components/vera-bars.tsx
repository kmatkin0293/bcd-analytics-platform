import { Box, Flex } from "@chakra-ui/react";

const BARS = [
  { height: "8px", delay: "0s" },
  { height: "18px", delay: ".18s" },
  { height: "11px", delay: ".36s" },
  { height: "15px", delay: ".12s" },
];

export function VeraBars({
  barWidth = "3px",
  height = "18px",
  gap = "3px",
  colors = ["gt.500", "gt.500", "gt.500", "gtDark"],
}: {
  barWidth?: string;
  height?: string;
  gap?: string;
  colors?: [string, string, string, string];
}) {
  return (
    <Flex align="flex-end" gap={gap} h={height} flexShrink={0}>
      {BARS.map((bar, index) => (
        <Box
          key={bar.height}
          w={barWidth}
          h={bar.height}
          bg={colors[index]}
          transformOrigin="bottom"
          animation="beat 1.5s ease-in-out infinite"
          animationDelay={bar.delay}
        />
      ))}
    </Flex>
  );
}
