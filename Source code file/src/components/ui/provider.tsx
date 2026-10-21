"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/toaster";
import { system } from "@/theme/system";

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    // ThemeProvider must be the outermost provider, not nested inside
    // ChakraProvider: it renders a blocking theme-detection <script> as its
    // first child to avoid a flash of the wrong theme, and when that's
    // nested inside ChakraProvider, Next's streaming SSR interleaves it
    // with Emotion's own injected <style> tags at the same tree position —
    // a structural (tag-type) hydration mismatch on every single page load.
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ChakraProvider value={system}>
        {children}
        <Toaster />
      </ChakraProvider>
    </ThemeProvider>
  );
}
