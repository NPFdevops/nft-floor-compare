import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase the limit to avoid Vercel warning: Adjust chunk size limit for this warning via build.chunkSizeWarningLimit
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split large libraries into separate chunks
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            // Add more specific splits for other large dependencies
            // Example: if (id.includes('lodash')) return 'vendor-lodash'
            return 'vendor'
          }
        },
      },
    },
  },
})
