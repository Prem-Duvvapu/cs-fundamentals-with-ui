import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // MarkdownRenderer's chunk was 663 KB in one piece, and two libraries account for most
        // of it: katex (272 KB minified) and highlight.js. Splitting them out does not reduce
        // what a first topic visit downloads — every lesson needs the renderer — but it stops a
        // change to our own renderer code from invalidating 663 KB of unchanged vendor bytes in
        // the reader's cache, and keeps each chunk under Vite's 500 KB warning.
        // Rolldown (Vite 8's bundler) only accepts the function form here.
        manualChunks(id) {
          if (id.includes('node_modules/katex')) return 'katex'
          if (id.includes('node_modules/highlight.js')) return 'highlight'
          return undefined
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': process.env.VITE_BACKEND_TARGET || 'http://localhost:9190'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    maxWorkers: 2,
    setupFiles: './src/setupTests.js',
    testTimeout: 15000,
    // react-markdown and its remark/rehype plugin chain are ESM-only;
    // force them through Vite's transform instead of Node's native
    // require() resolution under the jsdom test environment.
    server: {
      deps: {
        inline: ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-highlight']
      }
    }
  }
})
