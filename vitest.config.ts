import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws by design when imported outside a React Server
      // Component graph. Under Vitest that guard has nothing to protect, so it
      // is stubbed out rather than removed from the source.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["app/**", "components/**", "hooks/**", "lib/**"],
      exclude: ["**/*.test.*", "app/layout.tsx", "lib/server/fixtures.ts"],
    },
  },
});
