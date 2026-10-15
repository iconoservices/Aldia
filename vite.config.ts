import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Librerías en chunks propios: cambian poco, así que tras cada deploy el
        // service worker solo vuelve a bajar el código de la app (no ~600 KB de vendor).
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/firebase/') || id.includes('/@firebase/') || id.includes('/idb/')) return 'vendor-firebase';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'vendor-react';
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'AlDía - Tu Cerebro Digital',
        short_name: 'AlDía',
        description: 'Gestión inteligente de misiones, vida y finanzas en un solo lugar.',
        theme_color: '#0FA97A',
        background_color: '#F7FAF8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Las fuentes de Google (texto + íconos) no entran al precache por ser de otro
        // dominio: sin esto, cada arranque en frío las vuelve a pedir a la red.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' }
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    // 5180 por defecto (Firebase, bookmarks); si viene PORT en el entorno, manda ese.
    port: Number(process.env.PORT) || 5180,
    host: '0.0.0.0',
    proxy: {
      '/api/ddg-search': {
        target: 'https://html.duckduckgo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ddg-search/, '/html/'),
      },
      '/api/fetch-page': {
        target: 'https://api.allorigins.win',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/fetch-page/, '/get'),
      }
    }
  }
})
