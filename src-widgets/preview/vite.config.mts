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
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

const IMAGE_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
};

/**
 * The widgets reference their images relative to the vis root, and the screenshot page (`shots.html`) uses the
 * real defaults. This serves them: `widgets/...` from this repository (the lock images of the vis-1 set), `img/...`
 * (lamp, thermometer) from the `www/img` folder of vis-2 if `VIS2_IMG` points to one.
 */
function visImages(): any {
    const roots: [string, string | undefined][] = [
        ['/widgets/', path.join(here, '..', '..', 'widgets')],
        ['/img/', process.env.VIS2_IMG],
    ];
    return {
        name: 'vis-images',
        configureServer(server: any): void {
            server.middlewares.use((req: any, res: any, next: () => void): void => {
                const url = decodeURIComponent((req.url || '').split('?')[0]);
                for (const [prefix, dir] of roots) {
                    if (!dir || !url.startsWith(prefix)) {
                        continue;
                    }
                    const file = path.join(dir, url.substring(prefix.length));
                    const type = IMAGE_TYPES[path.extname(file).toLowerCase()];
                    if (type && file.startsWith(path.join(dir, path.sep)) && fs.existsSync(file)) {
                        res.setHeader('Content-Type', type);
                        fs.createReadStream(file).pipe(res);
                        return;
                    }
                }
                next();
            });
        },
    };
}

export default {
    root: here,
    publicDir: false,
    plugins: [
        // the preview imports the widgets with a top-level await, after the stub is on `window`
        topLevelAwait({ promiseExportName: '__tla', promiseImportName: (i: number) => `__tla_${i}` }),
        react(),
        visImages(),
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
