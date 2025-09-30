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
        // Create a vendor chunk for node_modules to keep app chunks smaller
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
