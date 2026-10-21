"use client";

import { IconButton } from "@chakra-ui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { ChakraSvg } from "@/components/chakra-elements";

function SunIcon() {
  return (
    <ChakraSvg viewBox="0 0 20 20" fill="none" w="16px" h="16px">
      <path
        d="M10 1.5v2M10 16.5v2M3.5 10h-2M18.5 10h-2M5.3 5.3 3.9 3.9M16.1 16.1l-1.4-1.4M5.3 14.7l-1.4 1.4M16.1 3.9l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="3.75" stroke="currentColor" strokeWidth="1.5" />
    </ChakraSvg>
  );
}

function MoonIcon() {
  return (
    <ChakraSvg viewBox="0 0 20 20" fill="none" w="16px" h="16px">
      <path
        d="M17 11.4A7.2 7.2 0 0 1 8.6 3 7.2 7.2 0 1 0 17 11.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </ChakraSvg>
  );
}

export function ThemeToggle({ dark = false }: { dark?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <IconButton
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      size="xs"
      variant="ghost"
      borderRadius="6px"
      w="30px"
      h="30px"
      minW="30px"
      color={dark ? "sidebarMuted" : "fg.muted"}
      _hover={{
        color: dark ? "white" : "accent.default",
        bg: dark ? "sidebarSurface" : "bg.surface",
      }}
      transition="color 0.2s, background-color 0.2s, transform 0.2s"
      _active={{ transform: "scale(0.9) rotate(15deg)" }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
