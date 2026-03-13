import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey    = env.VITE_API_KEY    || ''
  const apiSecret = env.VITE_API_SECRET || ''

  return {
    plugins: [react()],
    server: {
      port: 3002,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiKey) {
                proxyReq.setHeader('Authorization', `token ${apiKey}:${apiSecret}`)
              }
              proxyReq.setHeader('X-Frappe-Site-Name', 'frontend')
            })
          }
        }
      }
    },
    build: { outDir: 'dist' }
  }
})
