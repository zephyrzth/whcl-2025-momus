import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: ".",
    include: ["tests/src/backend.test.ts"],
    environment: "node",
  },
});
