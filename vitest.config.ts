import { defineConfig } from "vitest/config";
import { defineVitestProject } from "@nuxt/test-utils/config";

/**
 * Two isolated Vitest projects so fast server-side unit tests never pay for a
 * browser-like environment, and Nuxt component tests get a real Nuxt context:
 *
 *   - `node`  — pure Node. Runs `*.test.ts` / `*.spec.ts` (e.g. server/utils).
 *               Does NOT load Nuxt and does NOT run `*.nuxt.test.ts`.
 *   - `nuxt`  — Nuxt runtime with happy-dom. Runs ONLY `*.nuxt.test.ts`.
 *
 * The include/exclude globs are mutually exclusive: the `*.nuxt.test.ts`
 * suffix is the single switch that routes a file to exactly one project, so
 * no test file is ever executed twice.
 *
 * `pnpm test` runs both projects. Run one in isolation with:
 *   pnpm test --project node
 *   pnpm test --project nuxt
 */

// Directories excluded from every project. `_legacy` and `.nuxt` are project
// specific and must be listed explicitly; the rest mirror the original config.
const sharedExclude = [
  "**/node_modules/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/_legacy/**",
  "**/dist/**",
];

export default defineConfig(async () => ({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.{test,spec}.ts"],
          // Route `*.nuxt.test.ts` away from the Node project so it runs only
          // under the Nuxt project below.
          exclude: [...sharedExclude, "**/*.nuxt.{test,spec}.ts"],
        },
      },
      await defineVitestProject({
        test: {
          name: "nuxt",
          environment: "nuxt",
          include: ["**/*.nuxt.{test,spec}.ts"],
          exclude: sharedExclude,
          environmentOptions: {
            // happy-dom is the installed DOM. jsdom is intentionally absent.
            nuxt: { domEnvironment: "happy-dom" },
          },
        },
      }),
    ],
  },
}));
