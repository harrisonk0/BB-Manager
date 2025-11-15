import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      build: { outDir: 'dist' },
      server: {
        port: 3000,
        host: '0.0.0.0',
        historyApiFallback: true
      },
      plugins: [dyadComponentTagger(), react()],
      define: {
        // Removed GEMINI_API_KEY from client-side bundle for security reasons.
        // If client-side access is needed, a backend proxy should be implemented.
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});