import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { allConfigArtifacts } from "../src/artifacts.js";

const outputDirectory = resolve(import.meta.dirname, "../dist/configs");
const standaloneDirectory = resolve(import.meta.dirname, "../dist/standalone");

rmSync(outputDirectory, { recursive: true, force: true });
rmSync(standaloneDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
mkdirSync(standaloneDirectory, { recursive: true });

for (const artifact of allConfigArtifacts()) {
  const source = `${JSON.stringify(artifact.config, null, 2)}\n`;
  writeFileSync(resolve(outputDirectory, artifact.fileName), source);
  writeFileSync(
    resolve(standaloneDirectory, `${artifact.publicName}.json`),
    source,
  );
}
