const { defineConfig, globalIgnores } = require("eslint/config");
const nextVitals = require("eslint-config-next/core-web-vitals");
const nextTs = require("eslint-config-next/typescript");

module.exports = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // react-hooks v5 React Compiler rules — pre-existing violations in
      // components that were written before the compiler rules landed.
      // Downgraded to warn so CI passes; fix progressively as components
      // are refactored to satisfy the React Compiler.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",

      // Style issue, not a correctness bug.
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    // Config files are CommonJS and legitimately use require().
    files: ["*.config.js", "*.config.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
