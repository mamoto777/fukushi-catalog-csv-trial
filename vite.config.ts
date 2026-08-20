import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  assetsInclude: ["**/*.xlsx"],
  define: {
    __OFFLINE_BUILD__: "false",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
