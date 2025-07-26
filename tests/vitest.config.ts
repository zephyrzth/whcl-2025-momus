import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: ".",
    include: ["tests/src/backend.test.ts", "tests/src/weather_agent.test.ts"],
    environment: "node",
  },
});
