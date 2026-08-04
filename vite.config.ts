import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'BeatTraffic KL',
        short_name: 'BeatTraffic',
        description: 'Real-time KL transit intelligence',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.data\.gov\.my\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dosm-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-maps-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
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
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
  optimizeDeps: {
    include: ['@react-google-maps/api'],
  },
});
