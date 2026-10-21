import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@engine': path.resolve(import.meta.dirname, '../studio'),
      '@templates': path.resolve(import.meta.dirname, '../templates'),
      '@schemas': path.resolve(import.meta.dirname, '../schemas'),
      '@fixtures': path.resolve(import.meta.dirname, '../fixtures'),
    },
  },
});
