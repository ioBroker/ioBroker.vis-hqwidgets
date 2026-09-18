/*
 * Build of the vis-2 (React) widget set.
 *
 * Careful with the `widgets/` folder: unlike a pure vis-2 widget set it is NOT generated here. It also holds the
 * vis-1 widget set (`widgets/hqwidgets.html` and `widgets/hqwidgets/**`), which is maintained by hand and still
 * shipped for vis. Only the sub folder of the React build is deleted and rebuilt.
 */
const { deleteFoldersRecursive, buildReact, npmInstall, copyFiles } = require('@iobroker/build-tools');
const fs = require('node:fs');

/** Where the built React widget set ends up. Must match `common.visWidgets.*.url` in io-package.json. */
const TARGET = 'widgets/vis-2-widgets-hqwidgets';

function copyAllFiles() {
    copyFiles(['src-widgets/build/**/*', '!src-widgets/build/index.html'], `${TARGET}/`);
}

/** Keeps the version in the vis-1 widget set in sync with package.json */
function syncLegacyVersion() {
    const pack = require('./package.json');

    const files = ['widgets/hqwidgets.html', 'widgets/hqwidgets/js/hqwidgets.js'];
    for (const file of files) {
        const content = fs.readFileSync(`${__dirname}/${file}`, 'utf8');
        const updated = content
            .replace(/version: "\d+\.\d+\.\d+"/, `version: "${pack.version}"`)
            .replace(/version: '\d+\.\d+\.\d+',/, `version: '${pack.version}',`)
            .replace(/version: "\d+\.\d+\.\d+",/, `version: "${pack.version}",`);
        if (content !== updated) {
            fs.writeFileSync(`${__dirname}/${file}`, updated);
            console.log(`${file} updated`);
        }
    }
}

if (process.argv.includes('--copy-files')) {
    copyAllFiles();
} else if (process.argv.includes('--build')) {
    buildReact(`${__dirname}/src-widgets`, { rootDir: __dirname, vite: true }).catch(e => {
        console.error(`Error by build: ${e}`);
        process.exit(1);
    });
} else if (process.argv.includes('--version')) {
    syncLegacyVersion();
} else {
    syncLegacyVersion();
    deleteFoldersRecursive(`${__dirname}/src-widgets/build`);
    deleteFoldersRecursive(`${__dirname}/${TARGET}`);
    npmInstall('src-widgets')
        .then(() => buildReact(`${__dirname}/src-widgets`, { rootDir: __dirname, vite: true }))
        .then(() => copyAllFiles())
        .catch(e => {
            console.error(`Error by build: ${e}`);
            process.exit(1);
        });
}
