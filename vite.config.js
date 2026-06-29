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
    // Default CSS code splitting enabled to reduce initial load blocking
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
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-chart': ['echarts'],
          'vendor-editor': ['quill', 'quill-image-resize-module-react', 'quill-resize-image']
        }
      }
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 800
  }
})
