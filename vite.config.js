import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@firebase/") || id.includes("/node_modules/firebase/")) {
            return "vendor-firebase"
          }
          if (id.includes("/node_modules/vuetify/")) return "vendor-vuetify"
          if (id.includes("/node_modules/vue/") || id.includes("/node_modules/vue-router/") ||
              id.includes("/node_modules/pinia/") || id.includes("/node_modules/@vue/")) {
            return "vendor-vue"
          }
        },
      },
    },
  },
})
