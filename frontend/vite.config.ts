import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    sourcemap: false,
    minify: false,
    rollupOptions: {
      treeshake: false
    }
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://web:80',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
