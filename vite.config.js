import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false
    },
    watch: {
      ignored: ['**/node_modules/**', '**/data/**', '**/.git/**']
    },
    // PostHog reverse proxy to bypass ad blockers
    proxy: {
      '/ingest': {
        target: 'https://us.i.posthog.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ingest/, '')
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lightweight-charts',
      'axios'
    ],
    exclude: ['better-sqlite3', 'node-cron']
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('lightweight-charts')) {
              return 'vendor-charts'
            }
            if (id.includes('posthog-js')) {
              return 'vendor-posthog'
            }
            if (id.includes('date-fns')) {
              return 'vendor-date'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})
