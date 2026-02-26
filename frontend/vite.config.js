import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: true, // setara 0.0.0.0
    allowedHosts: [
      // process.env.DOMAIN_NAME,
      'andalan-fluids-2.wahyutech.my.id',
    ],
  },
})
