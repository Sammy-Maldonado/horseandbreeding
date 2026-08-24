// nuxt.config.ts
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },

  // Nuxt 4 defaults `srcDir` to `app/`. This project keeps its application code
  // at the repository root, so the framework major migration does not double as
  // a directory reorganisation. This is the officially supported opt-out and
  // needs no `compatibilityVersion`. See ADR-008.
  srcDir: ".",
  dir: {
    app: "app"
  },

  css: ["~/assets/css/tailwind.css"],

  imports: {
    global: true
  },

  // Tailwind 4 is a Vite plugin, not a PostCSS plugin, so there is no `postcss`
  // block here any more. Nuxt's own Vite builder already applies `autoprefixer`
  // and `cssnano` by default, which is what the removed block was duplicating.
  // See ADR-009.
  modules: [],
  // Access to /api is governed by server/middleware/apiAccessControl.ts, which
  // Nitro registers automatically. See ADR-007.
  runtimeConfig: {
    DATABASE_URL: process.env.DATABASE_URL,
    VITE_HOST: process.env.VITE_HOST,
    VITE_API_SERVER_URL: process.env.VITE_API_SERVER_URL,
    VITE_JWT_SECRET: process.env.VITE_JWT_SECRET,
    VITE_EMAIL: process.env.VITE_EMAIL,
    VITE_EMAIL_PASSWORD: process.env.VITE_EMAIL_PASSWORD,
    NUXT_STRIPE_SECRET_KEY: process.env.NUXT_STRIPE_SECRET_KEY,
    public: {
      apiUrl: process.env.API_URL,
      appId: process.env.NUXT_APP_ID || "defaultAppId",
      stripe: {
        publishableKey: process.env.NUXT_STRIPE_PUBLIC_KEY || "" // Ensure this is defined
      }
    }
  },
  nitro: {
    rollupConfig: {
      plugins: [
        {
          // Prisma 7's generated client (generated/prisma/client.ts) opens with
          // `globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))`.
          // Nitro bundles the generated client into the server chunk and rewrites
          // `import.meta.url` to the virtual `file:///_entry.js`, which
          // `fileURLToPath` rejects on Windows (ERR_INVALID_FILE_URL_PATH),
          // crashing the production server at startup. The Prisma runtime never
          // reads that global — its own per-module banner defines `__dirname` —
          // so the assignment is guarded, not removed: on POSIX it still runs
          // exactly as generated. No dependency added. See ADR-015 (HOR-91).
          name: "prisma-generated-client-dirname-guard",
          transform(code: string, id: string) {
            if (!id.split("\\").join("/").includes("generated/prisma/client.")) {
              return null;
            }
            const shim =
              /globalThis\[["']__dirname["']\]\s*=\s*path\.dirname\(\s*fileURLToPath\(\s*(?:import\.meta\.url|globalThis\._importMeta_\.url)\s*\)\s*\)/;
            if (!shim.test(code)) {
              return null;
            }
            return {
              code: code.replace(
                shim,
                (match) =>
                  `try { ${match} } catch { /* virtual bundle URL — __dirname unused by the Prisma runtime */ }`
              ),
              map: null,
            };
          },
        },
      ],
    },
  },
  vite: {
    cacheDir: ".vite-cache", // Set a custom cache directory or use default

    plugins: [
      // Tailwind 4's official integration. It replaces `@nuxtjs/tailwindcss`,
      // which cannot resolve Tailwind 4 and still depends on a Nuxt 3 kit.
      // See ADR-009.
      tailwindcss()
    ]
  }
});
