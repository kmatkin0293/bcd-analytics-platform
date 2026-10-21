import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { HotkeyListener } from "@/components/config/hotkey-listener";
import { PageTransition } from "@/components/motion/page-transition";
import { ThoughtSpotAuthProvider } from "@/components/thoughtspot/thoughtspot-auth-provider";
import { Provider } from "@/components/ui/provider";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Grant Thornton",
    template: "%s · Grant Thornton",
  },
  description:
    "Grant Thornton — Audit, Tax and Advisory. Insight-driven analytics for clinical research and life sciences.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={jakarta.variable}
    >
      <body>
        <Provider>
          <HotkeyListener />
          <ThoughtSpotAuthProvider>
            <PageTransition>{children}</PageTransition>
          </ThoughtSpotAuthProvider>
        </Provider>
      </body>
    </html>
  );
}
