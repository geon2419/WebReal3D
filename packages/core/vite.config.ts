import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WebReal3DCore',
      fileName: (format) => format === 'es'
        ? 'web-real-3d-core.mjs'
        : 'web-real-3d-core.cjs',
      formats: ['es', 'cjs']
    }
  }
})
