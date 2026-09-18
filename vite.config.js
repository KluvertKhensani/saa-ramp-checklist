import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/saa-ramp-checklist/",

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-192.png",
        "icons/icon-maskable-512.png",
      ],

      manifest: {
        id: "/saa-ramp-checklist/",

        name:
          "SAA GRU Turnaround Operations",

        short_name:
          "SAA GRU",

        description:
          "Operational turnaround checklist, pushback countdown and performance monitoring tool.",

        start_url:
          "/saa-ramp-checklist/#/login",

        scope:
          "/saa-ramp-checklist/",

        display:
          "standalone",

        orientation:
          "portrait-primary",

        background_color:
          "#f3f5f8",

        theme_color:
          "#0b2545",

        icons: [
          {
            src:
              "icons/icon-192.png",
            sizes:
              "192x192",
            type:
              "image/png",
            purpose:
              "any",
          },
          {
            src:
              "icons/icon-512.png",
            sizes:
              "512x512",
            type:
              "image/png",
            purpose:
              "any",
          },
          {
            src:
              "icons/icon-maskable-192.png",
            sizes:
              "192x192",
            type:
              "image/png",
            purpose:
              "maskable",
          },
          {
            src:
              "icons/icon-maskable-512.png",
            sizes:
              "512x512",
            type:
              "image/png",
            purpose:
              "maskable",
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
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
});
