import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    testTimeout: 15000,
    // react-markdown and its remark/rehype plugin chain are ESM-only;
    // force them through Vite's transform instead of Node's native
    // require() resolution under the jsdom test environment.
    server: {
      deps: {
        inline: ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-highlight', 'mermaid']
      }
    }
  }
})
