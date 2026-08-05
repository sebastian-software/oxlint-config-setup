import { createHash } from "node:crypto";
import {
  accessSync,
  chmodSync,
  mkdirSync,
  writeFileSync,
  constants,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const version = "1.77.0";
const releaseTag = `apps_v${version}`;
const releaseBase = `https://github.com/oxc-project/oxc/releases/download/${releaseTag}`;
const spikeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.OXLINT_STANDALONE) {
  const suppliedBinary = resolve(process.env.OXLINT_STANDALONE);
  accessSync(suppliedBinary, constants.X_OK);
  const suppliedVersion = spawnSync(suppliedBinary, ["--version"], {
    encoding: "utf8",
  });
  if (
    suppliedVersion.status !== 0 ||
    suppliedVersion.stdout.trim() !== `Version: ${version}`
  ) {
    throw new Error(`OXLINT_STANDALONE must point to Oxlint ${version}`);
  }
  console.log(suppliedBinary);
  process.exit(0);
}

const assets = new Map([
  [
    "darwin-arm64",
    {
      archive: "oxlint-aarch64-apple-darwin.tar.gz",
      binary: "oxlint-aarch64-apple-darwin",
      sha256: "ef6e6bd5fcf3c20eb9f8120e559408a252c4ffa0baa4af9bff1780c45b8e2bf6",
    },
  ],
  [
    "darwin-x64",
    {
      archive: "oxlint-x86_64-apple-darwin.tar.gz",
      binary: "oxlint-x86_64-apple-darwin",
      sha256: "c0fe77e58f54d76afd23800ffb798506c369a48d05bb0068ccbd7f9fe3bd392f",
    },
  ],
  [
    "linux-arm64",
    {
      archive: "oxlint-aarch64-unknown-linux-gnu.tar.gz",
      binary: "oxlint-aarch64-unknown-linux-gnu",
      sha256: "182acc8df9ae90b5b34188ca2334b81e76352a1bba87b7c728087bd7f7cc395e",
    },
  ],
  [
    "linux-x64",
    {
      archive: "oxlint-x86_64-unknown-linux-gnu.tar.gz",
      binary: "oxlint-x86_64-unknown-linux-gnu",
      sha256: "09994ebf16e9cb3537d36847cb07ffc6f096557d3137a95db08fe2d67186c58c",
    },
  ],
]);

const asset = assets.get(`${process.platform}-${process.arch}`);
if (!asset) {
  throw new Error(
    `No automated standalone setup for ${process.platform}-${process.arch}. ` +
      "Set OXLINT_STANDALONE to an official Oxlint 1.77.0 binary instead.",
  );
}

const cacheRoot = join(spikeRoot, ".cache/standalone");
const binaryPath = join(cacheRoot, asset.binary);

try {
  accessSync(binaryPath, constants.X_OK);
  const versionResult = spawnSync(binaryPath, ["--version"], {
    encoding: "utf8",
  });
  if (versionResult.status === 0 && versionResult.stdout.includes(version)) {
    console.log(binaryPath);
    process.exit(0);
  }
} catch {
  // Download the pinned release below.
}

mkdirSync(cacheRoot, { recursive: true });
const response = await fetch(`${releaseBase}/${asset.archive}`);
if (!response.ok) {
  throw new Error(`Download failed with HTTP ${response.status}`);
}

const archiveBytes = new Uint8Array(await response.arrayBuffer());
const actualDigest = createHash("sha256").update(archiveBytes).digest("hex");
if (actualDigest !== asset.sha256) {
  throw new Error(
    `Checksum mismatch for ${asset.archive}: expected ${asset.sha256}, got ${actualDigest}`,
  );
}

const archivePath = join(cacheRoot, asset.archive);
writeFileSync(archivePath, archiveBytes);
const extracted = spawnSync("tar", ["-xzf", archivePath, "-C", cacheRoot], {
  encoding: "utf8",
});
if (extracted.status !== 0) {
  throw new Error(`Could not extract ${asset.archive}: ${extracted.stderr}`);
}
chmodSync(binaryPath, 0o755);
console.log(binaryPath);
