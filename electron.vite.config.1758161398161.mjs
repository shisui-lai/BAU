// electron.vite.config.mjs
import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
var __electron_vite_injected_import_meta_url = "file:///D:/%E5%B7%A5%E4%BD%9C%E7%9B%B8%E5%85%B3/09_%E9%AB%98%E9%80%9F%E4%B8%8A%E4%BD%8D%E6%9C%BA/BCU/electron.vite.config.mjs";
var electron_vite_config_default = defineConfig({
  build: {
    sourcemap: true,
    // 启用 Source Map
    rollupOptions: {
      external: ["fsevents"]
      // 将 fsevents 设置为外部模块
    }
  },
  resolve: {
    alias: {
      fsevents: false
      // 忽略 fsevents 模块
    }
  },
  main: {
    // 主进程配置：使用单一入口点，FTP服务器作为模块导入
    build: {
      sourcemap: true,
      // 主进程启用 Source Map
      rollupOptions: {
        input: "./src/main/index.js"
        // 单一入口点，避免生成多个可执行文件
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      sourcemap: true,
      // 预加载脚本启用 Source Map
      rollupOptions: {
        input: "./src/preload/index.js"
        // 单一入口点
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      sourcemap: true
      // 渲染进程启用 Source Map
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@": fileURLToPath(new URL("./src/renderer/src", __electron_vite_injected_import_meta_url))
      }
    },
    plugins: [vue()]
  }
});
export {
  electron_vite_config_default as default
};
