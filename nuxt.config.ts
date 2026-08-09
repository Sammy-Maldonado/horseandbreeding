// nuxt.config.ts
import Components from "unplugin-vue-components/vite";
import { PrimeVueResolver } from "@primevue/auto-import-resolver";
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  css: ["~/assets/css/tailwind.css"],

  imports: {
    global: true
  },
  plugins: ["~/plugins/regenerator-runtime.client.ts"],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  // Remove buildModules and include in modules
  modules: [
    "@nuxtjs/tailwindcss",
    "@vee-validate/nuxt", // Add any other modules here as needed
    "@nuxt/content",
    "nuxt-file-storage"
    // "@primevue/nuxt-module"
  ],
  // Access to /api is governed by server/middleware/apiAccessControl.ts, which
  // Nitro registers automatically. See ADR-007.
  runtimeConfig: {
    DATABASE_URL: process.env.DATABASE_URL,
    VITE_ENCRYPT_KEY: process.env.VITE_ENCRYPT_KEY,
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
      include: ["primevue"],
      exclude: ["vee-validate"]
    },

    plugins: [
      Components({
        resolvers: [PrimeVueResolver()]
      })
    ]
  }
});
