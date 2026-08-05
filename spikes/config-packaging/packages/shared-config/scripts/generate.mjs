import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createConfig } from "../dist/config.js";
import {
  allConfigOptions,
  configFileName,
} from "../dist/options.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(packageRoot, "generated");

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

for (const options of allConfigOptions()) {
  const outputPath = resolve(outputDirectory, configFileName(options));
  const config = createConfig(options);
  writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);
}
