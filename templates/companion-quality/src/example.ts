import { basename } from "node:path";

export function displayName(path: string): string {
  return basename(path);
}
