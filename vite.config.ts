import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/madeWatermelon/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fruits/*.png', 'box2d.min.js', 'pixi-6.4.2.min.js'],
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
            src: '/madeWatermelon/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/madeWatermelon/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
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
