import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment: the units under test are pure server-side logic.
    // Component tests will need a separate browser-like environment later.
    environment: "node",
    include: ["**/*.{test,spec}.ts"],
    exclude: ["node_modules", ".nuxt", ".output", "_legacy", "dist"],
  },
});
