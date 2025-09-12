import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: './client',
  build: {
    outDir: '../dist',
  },
  server: {
    port: 5173,
  },
})
