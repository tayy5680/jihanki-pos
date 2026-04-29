import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    envPrefix: 'VITE_',
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    envPrefix: 'VITE_',
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        extraResources: resolve('extraResources'),
      },
    },
    plugins: [vue()],
    optimizeDeps: {
      exclude: ['electron'],
    },
    server: {
      host: '0.0.0.0',
    },
    envPrefix: 'VITE_',
  },
})
