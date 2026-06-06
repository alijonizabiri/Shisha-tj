import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Don't inject SW in test/dev unless explicitly needed
      devOptions: { enabled: false },
      manifest: {
        name: 'SHISHA_TJ',
        short_name: 'ShishaTJ',
        description: 'Shower-cabin designer & CRM — Dushanbe',
        theme_color: '#18181b',
        background_color: '#09090b',
        display: 'standalone',
        // Open straight to the Designer — the page used offline on tablets
        start_url: '/designer',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache everything Vite emits (hashed assets never expire)
        globPatterns: ['**/*.{js,css,html,svg,woff2,ico,png}'],
        // API: network-first with 5 s timeout, fall back to cache for 24 h
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-runtime',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
