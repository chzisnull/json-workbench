import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/renderer/src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/renderer/src/test/setup.ts']
  }
})
