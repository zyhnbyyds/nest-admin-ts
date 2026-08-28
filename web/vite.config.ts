import path from "node:path";
import Vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import AutoImport from "unplugin-auto-import/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "~/": `${path.resolve(__dirname, "src")}/`,
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    AutoImport({
      imports: ["vue", "vue-router", "@vueuse/core"],
      dts: "./types/auto-imports.d.ts",
      dirs: ["./src/composables"],
      vueTemplate: true,
    }),
    UnoCSS(),
    Vue(),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
