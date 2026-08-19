import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // ── Dev Server ─────────────────────────────────────────────
  server: {
    port: 5173,

    // Proxy: /api/v1/* requests → backend at :3001
    // This avoids CORS issues during development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
