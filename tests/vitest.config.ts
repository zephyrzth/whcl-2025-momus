import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: ".",
    include: [
      "tests/src/backend.test.ts",
      "tests/src/weather_agent.test.ts",
      "tests/src/planner_agent_payments.test.ts",
    ],
    environment: "node",
    setupFiles: ["./tests/setup-env.ts"],
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});
