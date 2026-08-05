import { readFile } from "node:fs/promises";

export async function loadConfig(url) {
  return readFile(new URL("./config.json", url), "utf8");
}
