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
    // Enable minification with terser for better tree-shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // Remove console.log in production
        pure_funcs: ['console.log', 'console.info']
      }
    },
    // Split chunks intelligently to reduce initial bundle size
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: heavy libraries go into separate chunks
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue')) {
            return 'vue-vendor'
          }
          if (id.includes('node_modules/vue-router')) {
            return 'router'
          }
          if (id.includes('node_modules/quill') || id.includes('node_modules/@vueup')) {
            return 'editor'
          }
          // Admin pages — only loaded when visiting /admin
          if (id.includes('src/views/admin/')) {
            return 'admin'
          }
          // CRM pages
          if (id.includes('src/views/crm/')) {
            return 'crm'
          }
        }
      }
    },
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 800
  }
})
