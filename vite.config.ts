import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // 개발(serve) 시에는 루트('/'), 빌드(build) 시에는 배포용 '/pum/' 적용
  base: command === 'serve' ? '/' : '/pum/',
  plugins: [react()],
  server: {
    // /api 요청은 server 폴더의 Express 서버(4000번 포트)로 전달
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
}))
