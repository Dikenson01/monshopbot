const fs = require('fs');

const autoTransStr = fs.readFileSync('web/js/auto_translations.json', 'utf8');
const autoTrans = JSON.parse(autoTransStr);

const origTransFile = 'web/js/translations.js';
let transContent = fs.readFileSync(origTransFile, 'utf8');

const startRegex = /(?:const|let|var)\s+translations\s*=\s*\{/;
const match = transContent.match(startRegex);
if (!match) {
    console.error("Could not find start of translations object.");
    process.exit(1);
}

const startIndex = match.index + match[0].length - 1; // index of '{'
let openBraces = 0;
let endIndex = -1;
for (let i = startIndex; i < transContent.length; i++) {
    if (transContent[i] === '{') openBraces++;
    if (transContent[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
            endIndex = i;
            break;
        }
    }
}

if (endIndex === -1) {
    console.error("Could not find end of translations object.");
    process.exit(1);
}

const objStr = transContent.substring(startIndex, endIndex + 1);

// Evaluate the object string in an isolated context
const vm = require('vm');
let existingTranslations;
try {
    existingTranslations = vm.runInNewContext('(' + objStr + ')');
} catch (e) {
    console.error("Failed to parse object string", e);
    process.exit(1);
}

// Merge auto translations into existing translations
for (const lang of Object.keys(autoTrans)) {
    if (!existingTranslations[lang]) {
        existingTranslations[lang] = {};
    }
    for (const key of Object.keys(autoTrans[lang])) {
        if (!existingTranslations[lang][key]) {
            existingTranslations[lang][key] = autoTrans[lang][key];
        }
    }
}

const newObjString = JSON.stringify(existingTranslations, null, 4);
const before = transContent.substring(0, startIndex);
const after = transContent.substring(endIndex + 1);

let finalContent = before + newObjString + after;

fs.writeFileSync(origTransFile, finalContent);
console.log('Merge complete!');
