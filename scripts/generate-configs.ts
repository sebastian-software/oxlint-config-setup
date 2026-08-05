import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createConfig } from "../src/config.js";
import { allConfigOptions, configFileName } from "../src/options.js";

const outputDirectory = resolve(import.meta.dirname, "../dist/configs");

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });

for (const options of allConfigOptions()) {
  const outputPath = resolve(outputDirectory, configFileName(options));
  const config = createConfig(options);
  writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);
}
