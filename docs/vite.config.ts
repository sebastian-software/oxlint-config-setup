import { ardo } from "ardo/vite";
import { defineConfig } from "vite";

import pkg from "../package.json" with { type: "json" };

export default defineConfig({
  base: "/oxlint-config-setup/",
  optimizeDeps: {
    include: [
      "ardo/mdx-provider",
      "ardo/runtime",
      "ardo/ui",
      "lucide-react",
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router",
      "react-router/dom",
    ],
  },
  plugins: [
    ardo({
      base: "/oxlint-config-setup/",
      brand: {
        accent: 155,
        color: 155,
        neutral: 155,
      },
      description:
        "Opinionated, prebuilt Oxlint configurations for modern TypeScript projects.",
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
        "https://sebastian-software.github.io/oxlint-config-setup/",
      title: "Oxlint Config Setup",
      typedoc: {
        entryPoints: ["../src/index.ts"],
        tsconfig: "../tsconfig.json",
      },
      validation: {
        frontmatter: {
          invalid: "error",
          // TypeDoc currently emits its own sidebar_position field.
          unknown: "ignore",
        },
      },
    }),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "react-router"],
  },
});
