/* global process */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const applicationVersion = process.env.npm_package_version || "1.0.0";

export default defineConfig({
  base: "/saa-ramp-checklist/",

  define: {
    __APP_VERSION__: JSON.stringify(applicationVersion),
  },

  plugins: [
    react(),

    VitePWA({
      registerType: "prompt",
      injectRegister: null,

      includeAssets: [
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-192.png",
        "icons/icon-maskable-512.png",
      ],

      manifest: {
        id: "/saa-ramp-checklist/",

        name: "OPS Check-List GRU - Turnaround Report",

        short_name: "OPS GRU",

        description:
          "PTS-aligned GRU turnaround reporting, operational task monitoring and delay performance application.",

        start_url: "/saa-ramp-checklist/#/login",

        scope: "/saa-ramp-checklist/",

        display: "standalone",

        orientation: "portrait-primary",

        background_color: "#f3f5f8",

        theme_color: "#0b2545",

        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        navigateFallback:
          "/saa-ramp-checklist/index.html",

        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webp}",
        ],

        cleanupOutdatedCaches: true,

        clientsClaim: true,

        skipWaiting: false,

        navigateFallbackDenylist: [
          /^\/api\//,
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
});
