/*
 * Renders the screenshots of the documentation into `docs/img/`.
 *
 *     npm run screenshots                  (all of them)
 *     npm run screenshots -- door lock     (only these)
 *
 * Starts the preview dev server on a port of its own, opens `shots.html` in a headless Chrome and saves every
 * `<section data-shot="name">` of that page as `docs/img/name.png`, at twice the size for sharp images.
 *
 * - A local Chrome or Edge is needed; `CHROME` overrides the path of the executable.
 * - `VIS2_IMG` may point to the `www/img` folder of vis-2 (e.g. `ioBroker.vis-2/packages/iobroker.vis-2/www/img`),
 *   then the lamp and the thermometer are the images vis-2 really shows. Without it the page uses its own icons.
 *
 * Talks to Chrome over the DevTools protocol with the WebSocket built into node 22 - no puppeteer needed.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(here, '..', '..', 'docs', 'img');
const PORT = 4175;
const DEBUG_PORT = 9333;
const SCALE = 2;
// The popup of the shutter keeps itself inside the window, so the window has to be taller than the page
const VIEWPORT = { width: 1900, height: 4000 };

const only = process.argv.slice(2);

function findChrome() {
    const candidates = [
        process.env.CHROME,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ];
    const found = candidates.find(file => file && fs.existsSync(file));
    if (!found) {
        throw new Error('No Chrome found - set CHROME to the path of the browser executable');
    }
    return found;
}

/** Just enough of a DevTools protocol client: send a command, get its result */
async function connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });
    let lastId = 0;
    const pending = new Map();
    ws.onmessage = event => {
        const message = JSON.parse(event.data);
        const callbacks = message.id ? pending.get(message.id) : null;
        if (callbacks) {
            pending.delete(message.id);
            if (message.error) {
                callbacks.reject(new Error(message.error.message));
            } else {
                callbacks.resolve(message.result);
            }
        }
    };
    return {
        send: (method, params = {}) =>
            new Promise((resolve, reject) => {
                const id = ++lastId;
                pending.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params }));
            }),
        close: () => ws.close(),
    };
}

async function waitFor(what, timeout, check) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
        try {
            const result = await check();
            if (result) {
                return result;
            }
        } catch {
            // not there yet
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error(`Timeout while waiting for ${what}`);
}

const server = await createServer({
    configFile: path.join(here, 'vite.config.mts'),
    server: { port: PORT, strictPort: true },
    // Not the cache of a running `npm run preview`: two dev servers must not share their optimized dependencies
    cacheDir: path.join(here, '.vite', 'shots'),
    logLevel: 'warn',
});
await server.listen();

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-shots-'));
const chrome = spawn(
    findChrome(),
    [
        '--headless',
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--hide-scrollbars',
        'about:blank',
    ],
    { stdio: 'ignore' },
);

let failed = false;
try {
    const target = await waitFor('Chrome', 20000, async () => {
        const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
        return targets.find(item => item.type === 'page');
    });
    const cdp = await connect(target.webSocketDebuggerUrl);
    await cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: SCALE, mobile: false });
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/shots.html` });

    const evaluate = async expression =>
        (await cdp.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

    await waitFor('the scenes', 90000, () => evaluate('window.__shotsReady === true'));

    const pageHeight = await evaluate('document.documentElement.scrollHeight');
    if (pageHeight > VIEWPORT.height) {
        console.warn(`The page (${pageHeight}px) is taller than the window - the shutter popup may be misplaced`);
    }

    const shots = JSON.parse(
        await evaluate(`JSON.stringify([...document.querySelectorAll('[data-shot]')].map(el => {
            const box = el.getBoundingClientRect();
            return { name: el.dataset.shot, x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
        }))`),
    ).filter(shot => !only.length || only.includes(shot.name));

    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const shot of shots) {
        // Rounded inwards, so a section on a fractional position does not pull in a line of the page background
        const x = Math.ceil(shot.x);
        const y = Math.ceil(shot.y);
        const { data } = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            clip: {
                x,
                y,
                width: Math.floor(shot.x + shot.width) - x,
                height: Math.floor(shot.y + shot.height) - y,
                scale: 1,
            },
            captureBeyondViewport: true,
        });
        fs.writeFileSync(path.join(OUT_DIR, `${shot.name}.png`), Buffer.from(data, 'base64'));
        console.log(`docs/img/${shot.name}.png  (${Math.round(shot.width)} x ${Math.round(shot.height)})`);
    }
    cdp.close();
} catch (error) {
    failed = true;
    console.error(error);
} finally {
    chrome.kill();
    await server.close();
    // Chrome releases its profile only after it exited
    setTimeout(() => {
        fs.rmSync(profile, { recursive: true, force: true });
        process.exit(failed ? 1 : 0);
    }, 1000);
}
