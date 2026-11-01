import { fileURLToPath, URL } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'local-fonts-and-ui-coverage',
      transformIndexHtml: { order: "pre", handler(html) {
        // Fonts are bundled from src/assets/fonts with content hashes and display:swap.
        return html.replace(/<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\s*/g, '').replace('type="image/png" href="/brand/lurems-isotipo-transparent.png"', 'type="image/webp" href="/src/assets/img/lurems-isotipo-transparent.webp"')
      } },
      buildStart() {
        const icons = new Set(JSON.parse(readFileSync(new URL('./src/assets/fonts/mdi-icons.json', import.meta.url))))
        const components = readFileSync(new URL('./src/plugins/theme/components.js', import.meta.url), 'utf8')
        const scan = directory => {
          for (const item of readdirSync(directory, { withFileTypes: true })) {
            const path = resolve(directory, item.name)
            if (item.isDirectory()) scan(path)
            else if (/\.(vue|js)$/.test(path)) {
              const source = readFileSync(path, 'utf8')
              for (const [icon] of source.matchAll(/mdi-[a-z0-9-]+/g)) {
                if (!icons.has(icon)) this.error(`Icon ${icon} in ${path} is missing from src/assets/fonts. Regenerate the MDI subset.`)
              }
              if (path.endsWith('.vue')) for (const [, tag] of source.matchAll(/<(v-[a-z][a-z-]*)\b/g)) {
                const name = 'V' + tag.slice(2).split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('')
                if (!new RegExp(`\\b${name}\\b`).test(components)) this.error(`Register ${name} in src/plugins/theme/components.js`)
              }
            }
          }
        }
        scan(fileURLToPath(new URL('./src', import.meta.url)))
      },
    },
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
          // Shared URL exports and Vue's helper reuse the already loaded runtime.
          if (/\/src\/assets\/img\/lurems-.*\.webp$/.test(id) || id.includes("plugin-vue:export-helper")) return "vendor-vue"

          if (/\/src\/(?:plugins\/Firebase\/(?:firebase|firestore|authObserver)|services\/(?:accountService|onboardingService|legalPublicationService))\.js$/.test(id)) return "firebase-session"

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
