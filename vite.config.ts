import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/pum/',
  plugins: [react()],
  server: {
    // /api 요청은 server 폴더의 Express 서버(4000번 포트)로 전달
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
})
