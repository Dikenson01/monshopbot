const fs = require('fs');
const content = fs.readFileSync('web/js/translations.js', 'utf8');

const start = content.indexOf('const translations = {');
let objStr = content.substring(start, content.indexOf('};\n', start) + 1);

const evalStr = objStr + '\nmodule.exports = translations;';
fs.writeFileSync(__dirname + '/temp_trans.js', evalStr);
const trans = require('./temp_trans.js');

const frKeys = Object.keys(trans.fr);
const deKeys = Object.keys(trans.de || {});

console.log("Total FR keys:", frKeys.length);
console.log("Total DE keys:", deKeys.length);

const missingDe = frKeys.filter(k => !deKeys.includes(k));
console.log("Missing in DE (" + missingDe.length + "):", missingDe);
