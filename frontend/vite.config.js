import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: true, // setara 0.0.0.0
    allowedHosts: [
      'andalan-fluids.wahyutech-2.my.id',
    ],
  },
})
