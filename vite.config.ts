import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['gsap', 'gsap/ScrollTrigger'],
  },
  server: {
    allowedHosts: ['7cfa-190-249-179-10.ngrok-free.app'],
  },
})
