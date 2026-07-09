import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      // What to measure coverage on
      include: ["server/**/*.ts", "lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/node_modules/**",
        "lib/env.ts",        // pure config, not logic
        "lib/logger.ts",     // infrastructure, not business logic
        "lib/rate-limit.ts", // infrastructure
      ],
      thresholds: {
        lines:      8,
        functions:  4,
        branches:   5,
        statements: 8,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // next/server-only is a Next.js runtime stub that throws when imported
      // outside Next.js. In the Vitest Node environment we replace it with
      // an empty module so services that use it can be tested normally.
      "server-only": path.resolve(__dirname, "tests/__mocks__/server-only.ts"),
    },
  },
});
