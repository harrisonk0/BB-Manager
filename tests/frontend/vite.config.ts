import { defineConfig, mergeConfig } from "vite";
import applicationConfig from "../../vite.config";
/** Isolated dependency cache avoids concurrent developer-server optimiser invalidation. */
export default defineConfig((environment) =>
  mergeConfig(
    typeof applicationConfig === "function"
      ? applicationConfig(environment)
      : applicationConfig,
    {
      cacheDir: `node_modules/.vite-frontend-fixtures-${process.env.FRONTEND_PORT ?? "4192"}`,
      server: { hmr: false },
    },
  ),
);
