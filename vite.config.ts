import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg', 'data/*'],
      manifest: {
        name: 'TekDex',
        short_name: 'TekDex',
        description: 'TekDex — an offline breeding, extraction, and raising-timer tool for ARK: Survival Ascended. Not affiliated with Studio Wildcard.',
        theme_color: '#006C00',
        background_color: '#0b1f12',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2,json,png}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
