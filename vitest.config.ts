import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '0-news/**',
      'e2e/**',                    // Playwright tests, not vitest
      '__tests__/e2e-2000/**',     // live-server integration tests, not unit tests
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // Enforce minimum coverage on critical paths
      thresholds: {
        branches:  60,
        functions: 70,
        lines:     70,
        statements: 70,
      },
      // Only measure coverage on business-logic files (not UI boilerplate)
      include: [
        'lib/**/*.ts',
        'app/api/**/*.ts',
      ],
      exclude: [
        'lib/sample-data/**',
        'lib/supabase/**',
        'lib/logger*',
        '**/*.d.ts',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
