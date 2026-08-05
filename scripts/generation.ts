export function assertGeneratedContent(
  relativePath: string,
  current: string,
  expected: string,
): void {
  if (current !== expected) {
    throw new Error(
      `Generated file ${relativePath} is stale; run pnpm generate`,
    );
  }
}
