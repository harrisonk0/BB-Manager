import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
const repositoryRoot = path.resolve(import.meta.dirname, '../..');
// Dedicated loopback component workbench. Never use this config for deployment.
export default defineConfig({
    root: repositoryRoot,
    cacheDir: 'node_modules/.vite-design-audit',
    plugins: [
        {
            name: 'audit-fixture-client',
            enforce: 'pre',
            resolveId(source) {
                if (/(?:^|\/)supabaseClient(?:\.ts)?$/.test(source)) {
                    return path.resolve(import.meta.dirname, 'fixture-client.ts');
                }
            },
            configureServer(server) {
                server.middlewares.use((request, response, next) => {
                    const pathname = request.url?.split('?')[0];
                    if (['/', '/index.html', '/index.tsx', '/App.tsx'].includes(pathname ?? '')) {
                        response.statusCode = 403;
                        response.end('Use /scripts/design-audit/harness.html for synthetic component inspection.');
                        return;
                    }
                    next();
                });
            },
        },
        react(),
    ],
    resolve: { alias: { '@': repositoryRoot } },
    server: { host: '127.0.0.1', port: 4174, strictPort: true },
});
