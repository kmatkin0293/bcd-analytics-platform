import { ChakraSvg } from "@/components/chakra-elements";

/** Small lightning-bolt glyph — matches the app's existing inline-SVG icon style (no new icon dependency). */
export function ZapIcon() {
  return (
    <ChakraSvg viewBox="0 0 24 24" w="14px" h="14px" fill="none" flexShrink={0}>
      <path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="currentColor"
      />
    </ChakraSvg>
  );
}

export function LockIcon() {
  return (
    <ChakraSvg viewBox="0 0 24 24" w="11px" h="11px" fill="none" flexShrink={0}>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </ChakraSvg>
  );
}
