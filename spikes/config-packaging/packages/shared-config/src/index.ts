import { defineConfig } from "oxlint";

export const recommended = defineConfig({
  categories: {
    correctness: "off",
  },
  plugins: [],
  rules: {
    "no-console": "warn",
    "no-debugger": "error",
  },
});

export default recommended;
