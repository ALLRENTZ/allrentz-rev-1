import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/components/ui/', // shadcn/ui components
        'src/integrations/supabase/types.ts', // auto-generated
        '**/*.d.ts',
        'dist/',
        'coverage/',
        'public/',
        '*.config.*'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        // Critical business logic requires higher coverage
        'src/services/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/utils/': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    // Performance testing
    benchmark: {
      include: ['**/*.bench.{ts,tsx}']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})