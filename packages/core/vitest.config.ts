import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    },
    coverage: {
      reporter: ['text', 'lcov']
    }
  }
})
