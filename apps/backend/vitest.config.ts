/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './src/__tests__/setup.ts'
  },
  // Force vitest to ignore any external configs
  configFile: false,
  root: path.resolve(__dirname),
  // Completely disable any CSS/PostCSS processing
  css: {
    postcss: {},
    modules: false
  },
  // Override plugin loading to prevent PostCSS
  plugins: [],
  // Prevent config file discovery
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})