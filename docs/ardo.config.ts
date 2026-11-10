import { defineArdoConfig } from "ardo/config";
import pkg from "../package.json" with { type: "json" };

export default defineArdoConfig({
  base: "/oxlint-config-setup/",
  description:
    "Opinionated, prebuilt, type-aware Oxlint configurations for modern TypeScript projects.",
  lang: "en-US",
  linkCheck: {
    checkAnchors: true,
    enabled: true,
    level: "error",
  },
  markdown: {
    lineNumbers: false,
    theme: {
      dark: "github-dark",
      light: "github-light",
    },
    toc: {
      level: [2, 3],
    },
  },
  metadata: {
    ogType: "website",
    twitterCard: "summary",
  },
  project: {
    license: pkg.license,
    name: pkg.name,
    repository: pkg.repository.url
      .replace(/^git\+/u, "")
      .replace(/\.git$/u, ""),
    version: pkg.version,
  },
  seo: {
    llms: { includeFull: true },
    robots: true,
    sitemap: true,
  },
  siteUrl:
    "https://sebastian-software.github.io",
  title: "Oxlint Config Setup",
  api: {
    entryPoints: ["../src/index.ts"],
    tsconfig: "./tsconfig.api.json",
    out: "api-reference",
    title: "API Reference",
  },
});
