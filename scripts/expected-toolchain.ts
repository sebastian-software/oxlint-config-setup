export const expectedVersions = {
  eslint: "10.8.1",
  node: "24.11.0",
  oxlint: "1.78.0",
  oxlintTsgolint: "7.0.2001",
  playwright: "2.11.0",
  pnpm: "11.21.0",
  sonarjs: "4.2.0",
  storybook: "0.12.0",
  testingLibrary: "7.16.2",
  tsdown: "0.22.14",
  tsx: "4.23.12",
  typescript: "7.0.2",
} as const;

export const expectedPackageManager =
  `pnpm@${expectedVersions.pnpm}+sha512.521705bce689924eac72f5a3587122f362689ef6571e55ba80076fd637c11132ecffada26fad4ea79c485bfddbfd3d5a2a5b05805a77e893de71ec8a6cca3bb1`;

export const expectedDependencies = {
  eslint: expectedVersions.eslint,
  "eslint-plugin-playwright": expectedVersions.playwright,
  "eslint-plugin-sonarjs": expectedVersions.sonarjs,
  "eslint-plugin-storybook": expectedVersions.storybook,
  "eslint-plugin-testing-library": expectedVersions.testingLibrary,
} as const;

export const expectedPeerDependencies = {
  oxlint: expectedVersions.oxlint,
  "oxlint-tsgolint": expectedVersions.oxlintTsgolint,
} as const;

export const expectedInstallCommand =
  `pnpm add -D oxlint-config-setup oxlint@${expectedVersions.oxlint} oxlint-tsgolint@${expectedVersions.oxlintTsgolint}`;
