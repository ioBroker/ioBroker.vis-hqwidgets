/*
 * Config of the local widget preview (`npm run preview` in the root).
 *
 * It is deliberately separate from `src-widgets/vite.config.ts`: no module federation, no shared modules - the
 * page brings its own react and its own stub of `window.visRxWidget`, so the widgets can be looked at without a
 * running ioBroker.
 */
import react from '@vitejs/plugin-react';
import topLevelAwait from 'vite-plugin-top-level-await';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

export default {
    root: here,
    publicDir: false,
    plugins: [
        // the preview imports the widgets with a top-level await, after the stub is on `window`
        topLevelAwait({ promiseExportName: '__tla', promiseImportName: (i: number) => `__tla_${i}` }),
        react(),
    ],
    build: { outDir: path.join(here, 'dist'), emptyOutDir: true, target: 'chrome100' },
    /*
     * Its own dependency cache, not the one of `src-widgets`. Two vite dev servers that share
     * `node_modules/.vite` overwrite each other's optimized dependencies, and the page then loads without any
     * error message and stays blank.
     */
    cacheDir: path.join(here, '.vite'),
    server: {
        port: 4173,
        // Rather fail with "Port 4173 is already in use" than quietly move to the next port - a second server on
        // the same project is exactly the case that breaks
        strictPort: true,
    },
    base: './',
};
