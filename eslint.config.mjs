import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    rules: {
      // Use core/logger.ts instead — see the "Observabilidade" section in
      // /home/eduardo/.claude/plans/quero-fazer-um-erp-modular-teacup.md.
      // console.error/warn are still allowed as a last-resort fallback inside
      // the logger implementation itself (see the override below).
      "no-console": "error",
    },
  },
  {
    files: ["src/core/logger.ts", "**/*.config.{ts,js,mjs}", "scripts/**"],
    rules: {
      "no-console": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific:
    "src/components/ui/**", // shadcn/ui generated components
    "src/db/migrations/**", // drizzle-kit generated SQL/meta
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
