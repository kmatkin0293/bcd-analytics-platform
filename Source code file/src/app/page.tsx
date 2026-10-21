import { Box } from "@chakra-ui/react";

import { CohortFlow } from "@/components/landing/cohort-flow";
import { CtaSection } from "@/components/landing/cta-section";
import { Hero } from "@/components/landing/hero";
import { IssueChips } from "@/components/landing/issue-chips";
import { PlatformOverview } from "@/components/landing/platform-overview";
import { ProofStats } from "@/components/landing/proof-stats";
import { QuoteSection } from "@/components/landing/quote-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function LandingPage() {
  return (
    <Box
      overflow="clip"
      bg="bg.canvas"
      transition="background-color 0.3s"
      backgroundImage={{
        base:
          "radial-gradient(1100px 520px at 12% -8%, rgba(75,40,130,.08), rgba(75,40,130,0) 70%), radial-gradient(rgba(75,40,130,.07) 1px, rgba(75,40,130,0) 1.4px)",
        _dark:
          "radial-gradient(1100px 520px at 12% -8%, rgba(139,95,196,.14), rgba(139,95,196,0) 70%), radial-gradient(rgba(139,95,196,.1) 1px, rgba(139,95,196,0) 1.4px)",
      }}
      backgroundSize="100% 100%, 22px 22px"
    >
      <SiteHeader />
      <Hero />
      <CohortFlow />
      <IssueChips />
      <PlatformOverview />
      <ProofStats />
      <QuoteSection />
      <CtaSection />
      <SiteFooter />
    </Box>
  );
}
