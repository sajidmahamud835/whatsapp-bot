import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = process.env.VITE_API_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/dashboard/',
  server: {
    port: 3001,
    proxy: {
      '/health': API_TARGET,
      '/clients': API_TARGET,
      '/stats': API_TARGET,
      '/ai': API_TARGET,
      '/cron': API_TARGET,
      '/webhooks': API_TARGET,
      '/config': API_TARGET,
      '/pro': API_TARGET,
      '^/[0-9]+/': { target: API_TARGET, changeOrigin: true },
    },
  },
})
