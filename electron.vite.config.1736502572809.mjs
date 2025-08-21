// electron.vite.config.mjs
import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
var __electron_vite_injected_import_meta_url = "file:///D:/Work/Code/Electron/Project/electron-app-bcu-v0.2.1/electron.vite.config.mjs";
var electron_vite_config_default = defineConfig({
  build: {
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
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
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
