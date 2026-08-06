import type { Config } from "@react-router/dev/config";
import { withArdoGitHubPages } from "ardo/vite";

const config = {
  prerender: true,
  ssr: false,
} satisfies Config;

export default withArdoGitHubPages(config, {
  basename: "/oxlint-config-setup/",
});
