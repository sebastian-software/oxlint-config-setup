import {
  ArdoErrorBoundary,
  ArdoFooter,
  ArdoGeneratedSidebar,
  ArdoHeader,
  ArdoHeaderActions,
  ArdoNav,
  ArdoNavLink,
  ArdoRoot,
  ArdoRootLayout,
  ArdoSidebar,
  ArdoSidebarSection,
  ArdoSocialLink,
} from "ardo/ui";
import config from "virtual:ardo/config";
import type { MetaFunction } from "react-router";
import "ardo/ui/styles.css";
import "@fontsource-variable/schibsted-grotesk/index.css";
import "@fontsource/fragment-mono/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";

import { ProductMark } from "./components/home/ProductMark.js";
import "./homepage.css";

const REPOSITORY_URL =
  "https://github.com/sebastian-software/oxlint-config-setup";

export const meta: MetaFunction = () => [
  { title: config.title },
  { name: "description", content: config.description },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return <ArdoRootLayout lang="en-US">{children}</ArdoRootLayout>;
}

export const ErrorBoundary = ArdoErrorBoundary;

export default function Root() {
  return (
    <ArdoRoot
      config={config}
      editLink={{
        pattern: `${REPOSITORY_URL}/edit/main/docs/app/routes/:path`,
        text: "Edit this page on GitHub",
      }}
      lastUpdated={{ enabled: true, text: "Last updated" }}
    >
      <ArdoHeader
        logo={<ProductMark />}
        searchPlaceholder="Search the documentation..."
        themeToggle
      >
        <ArdoNav>
          <ArdoNavLink to="/guide/getting-started">Guide</ArdoNavLink>
          <ArdoNavLink to="/reference/rule-catalog">Reference</ArdoNavLink>
          <ArdoNavLink to="/api-reference">API</ArdoNavLink>
        </ArdoNav>
        <ArdoHeaderActions>
          <ArdoSocialLink href={REPOSITORY_URL} icon="github" />
        </ArdoHeaderActions>
      </ArdoHeader>

      <ArdoSidebar>
        <ArdoSidebarSection
          id="guide"
          label="Guide"
          to="/guide/getting-started"
        >
          <ArdoGeneratedSidebar section="guide" />
        </ArdoSidebarSection>
        <ArdoSidebarSection
          id="reference"
          label="Reference"
          to="/reference/rule-catalog"
        >
          <ArdoGeneratedSidebar section="reference" />
        </ArdoSidebarSection>
        <ArdoSidebarSection
          id="api-reference"
          label="API"
          to="/api-reference"
        >
          <ArdoGeneratedSidebar section="api-reference" />
        </ArdoSidebarSection>
      </ArdoSidebar>

      <ArdoFooter
        copyright="Copyright 2026 Sebastian Software GmbH"
        message="Released under the MIT License."
        sponsor={{
          link: "https://sebastian-software.com/oss",
          text: "Sebastian Software",
        }}
      />
    </ArdoRoot>
  );
}
