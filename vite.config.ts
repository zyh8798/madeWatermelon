import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
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
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
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
