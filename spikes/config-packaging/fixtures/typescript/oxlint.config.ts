import { getOxlintConfig } from "@oxlint-config-setup/spike-config";
import { defineConfig } from "oxlint";

export default defineConfig(getOxlintConfig({ ai: false, node: false, react: false }));
