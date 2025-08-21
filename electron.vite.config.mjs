import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['fsevents'] // 将 fsevents 设置为外部模块
    }
  },
  resolve: {
    alias: {
      fsevents: false // 忽略 fsevents 模块
    }
  },
  main: {
    // 核心修改：显式声明主进程入口文件
    /*    build: {
      rollupOptions: {
        input: {
          index: './src/main/index.js',
          mbstask: './src/main/mbstask.js',
          dataExport: './src/main/dataExport.js' // 新增入口
        }
      }
    }, */
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    /*     build: {
      rollupOptions: {
        input: {
          index: './src/preload/index.js' // 确保路径正确
        }
      }
    }, */
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': fileURLToPath(new URL('./src/renderer/src', import.meta.url))
      }
    },
    plugins: [vue()]
  }
})
