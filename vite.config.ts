import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/madeWatermelon/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '合成大西瓜',
        short_name: '合成大西瓜',
        description: '经典合成大西瓜游戏',
        theme_color: '#ffe89d',
        background_color: '#ffe89d',
        display: 'standalone',
        start_url: '/madeWatermelon/',
        scope: '/madeWatermelon/',
        icons: [
          {
            src: '/madeWatermelon/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/madeWatermelon/icon-72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/madeWatermelon/icon-96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/madeWatermelon/icon-128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/madeWatermelon/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/madeWatermelon/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        modifyURLPrefix: {
          '': '/madeWatermelon/'
        },
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'offline-cache',
              expiration: {
                maxEntries: 200
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    cssTarget: 'chrome61',
  },
});
