// update version in hqwidgets.html and hqwidgets.js

const fs = require('node:fs');
const pack = require('./package.json');

const html = fs.readFileSync(`${__dirname}/widgets/hqwidgets.html`, 'utf8');
const newHtml = html
    .replace(/version: "\d+\.\d+\.\d+"/, `version: "${pack.version}"`)
    .replace(/version: '\d+\.\d+\.\d+'/, `version: '${pack.version}',`)
    .replace(/version: "\d+\.\d+\.\d+",/, `version: "${pack.version}",`);
if (html !== newHtml) {
    fs.writeFileSync(`${__dirname}/widgets/hqwidgets.html`, newHtml);
    console.log('hqwidgets.html updated');
}

const js = fs.readFileSync(`${__dirname}/widgets/hqwidgets/js/hqwidgets.js`, 'utf8');
const newJs = js
    .replace(/version: "\d+\.\d+\.\d+"/, `version: "${pack.version}"`)
    .replace(/version: '\d+\.\d+\.\d+',/, `version: '${pack.version}',`)
    .replace(/version: "\d+\.\d+\.\d+",/, `version: "${pack.version}",`);
if (js !== newJs) {
    fs.writeFileSync(`${__dirname}/widgets/hqwidgets/js/hqwidgets.js`, newJs);
    console.log('hqwidgets.js updated');
}
