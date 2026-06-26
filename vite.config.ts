import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isEditorBuild = process.env.VITE_EDITOR_MODE === 'true';

export default defineConfig({
  base: isEditorBuild ? './' : (process.env.BASE_PATH ?? '/'),
  plugins: [
    react(),
    isEditorBuild && {
      name: 'electron-html',
      transformIndexHtml(html) {
        // crossorigin breaks ES module loading via file:// in Electron
        return html.replace(/\s+crossorigin/g, '');
      },
    },
  ].filter(Boolean),
  build: isEditorBuild
    ? {
        rollupOptions: {
          input: {
            editor: path.resolve(__dirname, 'editor.html'),
          },
        },
        modulePreload: { polyfill: false },
      }
    : undefined,
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/games': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  assetsInclude: ['**/*.hdr'],
});
