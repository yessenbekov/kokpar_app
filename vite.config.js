import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Кокпар 3D",
        short_name: "Кокпар",
        description: "Традиционная казахская конная игра в 3D — играйте онлайн бесплатно в браузере.",
        theme_color: "#1a0f04",
        background_color: "#1a0f04",
        display: "fullscreen",
        orientation: "landscape",
        start_url: "/",
        scope: "/",
        lang: "ru",
        categories: ["games", "sports"],
        screenshots: [
          {
            src: "/images/og-preview.png",
            sizes: "1200x630",
            type: "image/png",
            label: "Кокпар 3D — казахская конная игра"
          }
        ],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          }
        ]
      },
      workbox: {
        // Cache all game assets including GLB models
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // GLB models — stale-while-revalidate: serve cache instantly, refresh in background
            urlPattern: /\/models\/.*\.glb$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "glb-models-v2",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Supabase API — network first with cache fallback
            urlPattern: /https:\/\/.*\.supabase\.co\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }
            }
          }
        ]
      }
    })
  ],
  build: {
    minify: "esbuild",
    target: "esnext"
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
