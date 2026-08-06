export const CONFIG_LEVELS = [
  "essential",
  "recommended",
  "strict",
] as const;

export type ConfigLevel = (typeof CONFIG_LEVELS)[number];
