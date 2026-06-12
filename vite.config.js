import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Combine all CSS into one file to prevent Vite from dynamically injecting CSS via JavaScript
    cssCodeSplit: false,
    // Enable minification with terser for better tree-shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // Remove console.log in production
        pure_funcs: ['console.log', 'console.info']
      }
    },
    // Split chunks intelligently to reduce initial bundle size
    // Rely on Vite's native async chunking
    rollupOptions: {
      output: {
        // Let Vite handle it automatically
      }
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 800
  }
})
