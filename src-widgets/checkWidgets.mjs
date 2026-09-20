/*
 * Checks the widget declarations against the vis-1 widget set.
 *
 * The React widgets only take over in vis-2 because they carry the SAME tpl id as the EJS templates in
 * `widgets/hqwidgets.html` - vis-2 replaces a widget type when a React widget declares the same id. And because
 * the widget data of a project is stored per attribute name, every attribute the vis-1 template offered has to
 * exist here as well, or a migrated widget silently loses that setting.
 *
 * Run with `npm run check-widgets` in the root, or `node checkWidgets.mjs` in this folder.
 */
import { build } from 'vite';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const TMP = path.join(HERE, '.check');
/** `visPrev` is written the way vis-2 requests it; the file itself lives here */
const PREV_PREFIX = 'widgets/vis-2-widgets-hqwidgets/';
const PUBLIC = path.join(HERE, 'public');
const LEGACY_HTML = path.join(HERE, '..', 'widgets', 'hqwidgets.html');

const WIDGETS = [
    'HqButton',
    'HqDimmer',
    'HqInTemp',
    'HqOutTemp',
    'HqShutter',
    'HqDoor',
    'HqLock',
    'HqCheckbox',
    'HqCircle',
    'HqOdometer',
];

/**
 * Attributes the vis-1 template offered but never used, so the React version does not offer them either.
 * Existing values stay in the project untouched, they simply have no effect - as before.
 */
const DROPPED = {
    // jQuery-UI show effects of the chart dialog; there is no jQuery-UI here any more
    tplHqInTemp: ['dialog_effect'],
    // ... plus the arc settings: the outdoor temperature never had a settable value, so `scala` was never
    // created for it and none of these did anything
    tplHqOutTemp: ['dialog_effect', 'min', 'max', 'step', 'circleWidth', 'showValue', 'alwaysShow'],
    // the lock only ever drew the left description, never a right one
    tplHqLock: ['infoFontRightSize', 'infoRightPaddingLeft', 'infoRightPaddingRight'],
};

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const entry = path.join(TMP, 'entry.ts');
writeFileSync(
    entry,
    `${WIDGETS.map(w => `import ${w} from '${SRC.replace(/\\/g, '/')}/${w}';`).join('\n')}
export default { ${WIDGETS.join(', ')} };
`,
);

await build({
    configFile: false,
    logLevel: 'error',
    build: {
        lib: { entry, formats: ['cjs'], fileName: () => 'bundle.cjs' },
        outDir: TMP,
        emptyOutDir: false,
        minify: false,
        rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
    },
});

// The widgets extend `window.visRxWidget`, which the vis-2 runtime provides
globalThis.window = { visRxWidget: class VisRxWidgetStub {} };

const mod = await import(pathToFileURL(path.join(TMP, 'bundle.cjs')).href);
const widgets = mod.default.default || mod.default;

const legacyHtml = readFileSync(LEGACY_HTML, 'utf8');

/** All attribute names the vis-1 template of that tpl id offered */
function legacyAttrs(tpl) {
    const start = legacyHtml.indexOf(`id="${tpl}"`);
    if (start === -1) {
        return null;
    }
    const block = legacyHtml.substring(start, legacyHtml.indexOf('</script>', start));
    const names = new Set();
    for (const m of block.matchAll(/data-vis-attrs\d*="([^"]*)"/g)) {
        for (let part of m[1].split(';')) {
            part = part.trim();
            if (!part || part.startsWith('group.')) {
                continue;
            }
            // strip the type (`/id`, `/slider,0,10,1`, ...), the default (`[..]`) and the index range `(1-x)`
            const name = part
                .split('/')[0]
                .replace(/\[[^\]]*]/, '')
                .replace(/\([^)]*\)/, '');
            if (name) {
                names.add(name);
            }
        }
    }
    return names;
}

let problems = 0;
const ids = new Set();
const en = JSON.parse(readFileSync(path.join(SRC, 'i18n', 'en.json'), 'utf8'));
const missingLabels = new Set();

for (const name of WIDGETS) {
    const info = widgets[name].getWidgetInfo();
    const prefix = `${name} (${info.id})`;

    if (ids.has(info.id)) {
        console.log(`ERROR ${prefix}: duplicate tpl id`);
        problems++;
    }
    ids.add(info.id);

    if (info.visSet !== 'hqwidgets') {
        console.log(`ERROR ${prefix}: visSet is "${info.visSet}", must be "hqwidgets"`);
        problems++;
    }
    if (!legacyHtml.includes(`id="${info.id}"`)) {
        console.log(`ERROR ${prefix}: no vis-1 template with this id - React would not replace anything`);
        problems++;
    }

    const legacy = legacyAttrs(info.id) || new Set();
    const own = new Set();
    const checkLabel = key => {
        if (key && !en[key]) {
            missingLabels.add(key);
        }
    };

    checkLabel(info.visWidgetLabel);
    checkLabel(info.visSetLabel);
    checkLabel(info.visHelp);

    // the preview of the palette, so a renamed or forgotten image does not leave a broken tooltip
    if (!info.visPrev?.startsWith(PREV_PREFIX)) {
        console.log(`ERROR ${prefix}: visPrev does not point into ${PREV_PREFIX}: ${info.visPrev}`);
        problems++;
    } else if (!existsSync(path.join(PUBLIC, info.visPrev.substring(PREV_PREFIX.length)))) {
        console.log(`ERROR ${prefix}: the preview ${info.visPrev} is not in public/`);
        problems++;
    }

    for (const group of info.visAttrs) {
        checkLabel(group.label);
        for (const field of group.fields) {
            if (!field.name) {
                console.log(`ERROR ${prefix}: field without name in group ${group.name}`);
                problems++;
            }
            own.add(field.name);
            checkLabel(field.label);
            checkLabel(field.tooltip);
            if (Array.isArray(field.options) && !field.noTranslation) {
                field.options.forEach(o => checkLabel(typeof o === 'string' ? o : o.label));
            }
        }
    }

    const dropped = DROPPED[info.id] || [];
    const missing = [...legacy].filter(a => !own.has(a) && !dropped.includes(a));
    if (missing.length) {
        console.log(`ERROR ${prefix}: vis-1 attributes are gone: ${missing.join(', ')}`);
        problems += missing.length;
    }
    const added = [...own].filter(a => !legacy.has(a));
    console.log(
        `OK    ${prefix}: ${info.visAttrs.length} groups, ${own.size} fields` +
            (added.length ? ` | new: ${added.join(', ')}` : ''),
    );
}

// '' is the "not set" entry of a select and needs no translation
const reallyMissing = [...missingLabels].filter(key => key !== '');
if (reallyMissing.length) {
    console.log(`\nERROR missing keys in i18n/en.json: ${reallyMissing.join(', ')}`);
    problems += reallyMissing.length;
}

rmSync(TMP, { recursive: true, force: true });
console.log(problems ? `\n${problems} problem(s)` : '\nall widget declarations fine');
process.exit(problems ? 1 : 0);
