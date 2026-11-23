import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'og-image.png',
        'icons/*.png',
        'splash/*.png',
        'data/*',
      ],
      manifest: {
        name: 'TekDex',
        short_name: 'TekDex',
        description:
          'An offline-first breeding companion for ARK: Survival Ascended. Not affiliated with Studio Wildcard.',
        theme_color: '#006C00',
        background_color: '#0b1f12',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icons/icon-48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-mono-512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
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
