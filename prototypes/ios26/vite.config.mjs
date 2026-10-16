import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [react(), tailwind()],
  envPrefix: "IOS26_",
  css: { postcss: { plugins: [] } },
  server: {
    host: "127.0.0.1",
    port: 4180,
    strictPort: true,
    fs: { allow: [resolve(import.meta.dirname, "../..")] },
  },
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        framework7: resolve(import.meta.dirname, "framework7.html"),
        nativePlus: resolve(import.meta.dirname, "native-plus.html"),
      },
    },
  },
});
