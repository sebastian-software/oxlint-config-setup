export const CONFIG_LEVELS = ["essential", "standard"] as const;

export type ConfigLevel = (typeof CONFIG_LEVELS)[number];
