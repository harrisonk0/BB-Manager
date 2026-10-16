import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: import.meta.dirname,
  envPrefix: "PROTOTYPE_",
  publicDir: "public",
  cacheDir: "../../node_modules/.vite-native-prototype",
  plugins: [react()],
  server: { host: "127.0.0.1", port: 4175, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
