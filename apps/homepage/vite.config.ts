import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      tracking: path.resolve(__dirname, '../../packages/tracking/src'),
      parallax: path.resolve(__dirname, '../../packages/parallax/src')
    }
  }
})
