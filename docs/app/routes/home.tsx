import type { MetaFunction } from "react-router";

import { AiSection } from "../components/home/AiSection.js";
import { ClosingSection } from "../components/home/ClosingSection.js";
import { Configurator } from "../components/home/Configurator.js";
import { CustomizationSection } from "../components/home/CustomizationSection.js";
import { FoundationsStrip } from "../components/home/FoundationsStrip.js";
import { Hero } from "../components/home/Hero.js";
import { OxlintSection } from "../components/home/OxlintSection.js";
import { PolicySection } from "../components/home/PolicySection.js";
import { ReceiptsSection } from "../components/home/ReceiptsSection.js";

const DESCRIPTION =
  "A complete, type-aware Oxlint preset with three policy levels, native ecosystem coverage, and constrained AI guardrails.";

export const meta: MetaFunction = () => [
  { title: "Oxlint Config Setup — Type-aware Oxlint, preconfigured" },
  { name: "description", content: DESCRIPTION },
  {
    property: "og:title",
    content: "Oxlint Config Setup — Type-aware by default",
  },
  { property: "og:description", content: DESCRIPTION },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary" },
];

export default function HomePage() {
  return (
    <div className="hp-page">
      <Hero />
      <FoundationsStrip />
      <Configurator />
      <PolicySection />
      <OxlintSection />
      <AiSection />
      <CustomizationSection />
      <ReceiptsSection />
      <ClosingSection />
    </div>
  );
}
