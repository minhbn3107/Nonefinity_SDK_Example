import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nonefinity/ai-sdk': path.resolve(__dirname, '../Nonefinity_SDK/src')
    }
  },
  server: {
    port: 3001,
    open: true
  },
  build: {
    outDir: 'react-dist'
  }
})
