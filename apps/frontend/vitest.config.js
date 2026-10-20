import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    clearMocks: true,
    include: ["src/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Measure application code, not tests, build configuration or setup files.
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/main.jsx",
        "src/firebase/**",
        "src/test/**",
        "src/**/*.test.{js,jsx}",
        "src/**/*.spec.{js,jsx}",
        "src/**/index.js", // Re-export-only barrel modules
      ],
    },
  },
});
