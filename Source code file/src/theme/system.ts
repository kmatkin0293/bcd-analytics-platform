import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
} from "@chakra-ui/react";

const buttonRecipe = defineRecipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    fontFamily: "body",
    fontSize: "13px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderRadius: "6px",
    borderWidth: "1px",
    borderColor: "transparent",
    cursor: "pointer",
    fontWeight: "600",
    transitionProperty: "background-color, color, border-color, transform, box-shadow",
    transitionDuration: "0.2s",
    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    _disabled: { opacity: 0.5, cursor: "not-allowed" },
    _active: { transform: "scale(0.98)" },
  },
  variants: {
    variant: {
      solid: {
        bg: "gt.500",
        color: "white",
        _hover: { bg: "gt.600", boxShadow: "0 6px 20px -4px rgba(75,40,130,0.45)" },
      },
      inverted: {
        bg: "gtDark",
        color: "white",
        _hover: { bg: "gt.500" },
      },
      outline: {
        bg: "transparent",
        color: "fg.default",
        borderColor: "border.strong",
        _hover: { bg: "bg.surface", borderColor: "gt.400", color: "gt.600" },
      },
      outlineOnDark: {
        bg: "transparent",
        color: "white",
        borderColor: "whiteAlpha.400",
        _hover: { bg: "white", color: "gt.500" },
      },
      ghost: {
        bg: "transparent",
        color: "fg.subtle",
        _hover: { color: "accent.default", bg: "bg.surface" },
      },
    },
    size: {
      md: { px: "24px", py: "16px" },
      sm: { px: "16px", py: "11px", fontSize: "12px" },
    },
  },
  defaultVariants: { variant: "solid", size: "md" },
});

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Grant Thornton signature deep purple palette — reserved as a
        // sparse accent (CTAs, active states, data) rather than a wash.
        gt: {
          50: { value: "#F3EEF9" },
          100: { value: "#E4D6F3" },
          200: { value: "#C9ACE6" },
          300: { value: "#A882D4" },
          400: { value: "#8B5FC4" },
          500: { value: "#4B2882" }, // GT Primary Purple
          600: { value: "#3E2070" },
          700: { value: "#32195D" },
          800: { value: "#25124A" },
          900: { value: "#170A33" },
        },
        gtDark: { value: "#1A0D36" },
        gtWhite: { value: "#FFFFFF" },
        gtPaper: { value: "#F8F5FC" },
        gtBorder: { value: "#E3DEEC" },
        gtBorderFaint: { value: "#EDE8F7" },
        gtMuted: { value: "#6B5F85" },
        gtSubtle: { value: "#5A4E72" },
        gtBody: { value: "#3D3255" },
        // Swiss-minimalist neutral ink scale — the primary surface/text
        // system; purple is layered on top sparingly.
        ink: {
          950: { value: "#0B0A0F" },
          900: { value: "#121117" },
          800: { value: "#1C1A24" },
          700: { value: "#2C2936" },
          600: { value: "#474257" },
          500: { value: "#6B6678" },
          400: { value: "#938DA3" },
          300: { value: "#BFBACC" },
          200: { value: "#E0DCE8" },
          100: { value: "#F0EDF5" },
          50: { value: "#F8F7FB" },
        },
        // Sidebar — persistent dark-purple brand surface, same in both modes
        sidebarInk: { value: "#1A0D36" },
        sidebarSurface: { value: "#25154A" },
        sidebarBorder: { value: "#3A2065" },
        sidebarMuted: { value: "#B8A8D4" },
        sidebarSubtle: { value: "#9E8EC0" },
        sidebarText: { value: "#F0ECF9" },
        // Status
        successBg: { value: "#EAF3EB" },
        successBorder: { value: "#C6D8C9" },
        successText: { value: "#2E5D3A" },
      },
      fonts: {
        heading: {
          value: "var(--font-jakarta), 'Plus Jakarta Sans', Helvetica, sans-serif",
        },
        body: {
          value: "var(--font-jakarta), 'Plus Jakarta Sans', Helvetica, sans-serif",
        },
        mono: { value: "var(--font-mono), 'Courier New', monospace" },
      },
      durations: {
        fast: { value: "150ms" },
        normal: { value: "250ms" },
        slow: { value: "450ms" },
      },
      easings: {
        standard: { value: "cubic-bezier(0.16, 1, 0.3, 1)" },
        emphasized: { value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
      },
    },
    semanticTokens: {
      colors: {
        // Nested objects (not flat "bg.canvas"-style string keys) so the
        // generated CSS variable's declaration and every var() reference to
        // it use the exact same name. `_dark` sub-keys ride on next-themes'
        // `.dark` class (attribute="class" in the ThemeProvider).
        bg: {
          canvas: {
            value: { base: "{colors.gtWhite}", _dark: "{colors.ink.950}" },
          },
          surface: {
            value: { base: "{colors.gtPaper}", _dark: "{colors.ink.900}" },
          },
          raised: {
            value: { base: "{colors.gtWhite}", _dark: "{colors.ink.800}" },
          },
          inverted: {
            value: { base: "{colors.sidebarInk}", _dark: "{colors.sidebarInk}" },
          },
        },
        fg: {
          default: {
            value: { base: "{colors.gtDark}", _dark: "{colors.ink.50}" },
          },
          muted: {
            value: { base: "{colors.gtMuted}", _dark: "{colors.ink.400}" },
          },
          subtle: {
            value: { base: "{colors.gtSubtle}", _dark: "{colors.ink.300}" },
          },
          body: {
            value: { base: "{colors.gtBody}", _dark: "{colors.ink.200}" },
          },
          inverted: { value: "{colors.sidebarText}" },
        },
        border: {
          default: {
            value: { base: "{colors.gtBorder}", _dark: "{colors.ink.700}" },
          },
          // Literal values (not token references) to avoid self-referential
          // CSS custom properties when token name and semantic path kebab-case
          // to the same string.
          strong: { value: { base: "#C8BADF", _dark: "#474257" } },
          tint: { value: { base: "#EDE8F7", _dark: "#1C1A24" } },
        },
        accent: {
          default: {
            value: { base: "{colors.gt.500}", _dark: "{colors.gt.400}" },
          },
        },
      },
    },
    recipes: {
      button: buttonRecipe,
    },
  },
});

export const system = createSystem(defaultConfig, config);
