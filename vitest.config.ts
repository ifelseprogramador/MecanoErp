import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: true,
    // e2e/ is Playwright's territory, never Vitest's.
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Coverage is meaningful for business logic, not for generated UI
      // primitives or config files. See "Boas práticas" in the plan.
      include: ["src/modules/**/*.{ts,tsx}", "src/core/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/__tests__/**",
        "src/components/ui/**",
        "src/db/migrations/**",
      ],
    },
  },
});
