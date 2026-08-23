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
  modules: [
    "@vee-validate/nuxt", // Add any other modules here as needed
    "nuxt-file-storage"
  ],
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
    // Removed middleware as discussed earlier
  },
  vite: {
    cacheDir: ".vite-cache", // Set a custom cache directory or use default
    optimizeDeps: {
      exclude: ["vee-validate"]
    },

    plugins: [
      // Tailwind 4's official integration. It replaces `@nuxtjs/tailwindcss`,
      // which cannot resolve Tailwind 4 and still depends on a Nuxt 3 kit.
      // See ADR-009.
      tailwindcss()
    ]
  }
});
