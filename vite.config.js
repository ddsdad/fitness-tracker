import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FitTrack — Personalized Fitness',
        short_name: 'FitTrack',
        description: 'AI-powered personalized fitness tracker',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Activate a new build immediately instead of waiting for all tabs to
        // close — prevents stale cached UI on web after a deploy.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Main bundle is ~2.2MB (large exercise/food DBs) — raise the precache
        // limit so it actually gets cached & updated rather than skipped.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      }
    })
  ]
})
