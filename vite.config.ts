import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/madeWatermelon/',
  plugins: [
    VitePWA({
    strategies: 'generateSW',
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'icon.svg', '*.png'],
    manifest: {
      name: '合成大西瓜',
      short_name: '合成大西瓜',
      description: '经典合成大西瓜游戏',
      theme_color: '#ffe89d',
      background_color: '#ffe89d',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/madeWatermelon/',
      start_url: '/madeWatermelon/',
      lang: 'zh-CN',
      icons: [
        {
          src: '/madeWatermelon/icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any'
        },
        {
          src: '/madeWatermelon/icon-72.png',
          sizes: '72x72',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/madeWatermelon/icon-96.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/madeWatermelon/icon-128.png',
          sizes: '128x128',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/madeWatermelon/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/madeWatermelon/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      navigateFallback: '/madeWatermelon/index.html',
      navigateFallbackDenylist: [/^\/api/],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: false,
      type: 'module'
    }
  })
  ],
  build: {
    cssTarget: 'chrome61',
  },
});
