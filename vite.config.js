import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves this repository from /paddock_pilot/ rather than /.
  base: mode === 'github-pages' ? '/paddock_pilot/' : '/',
  plugins: [react()],
  build: {
    // Keep the authoring template separate from the static index.html served by
    // a branch-based GitHub Pages site.
    rollupOptions: {
      input: fileURLToPath(new URL('./source/index.html', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
}))
