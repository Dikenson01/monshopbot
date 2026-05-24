const fs = require('fs');

const autoTransStr = fs.readFileSync('web/js/auto_translations.json', 'utf8');
const autoTrans = JSON.parse(autoTransStr);

const origTransFile = 'web/js/translations.js';
let transContent = fs.readFileSync(origTransFile, 'utf8');

// The translations.js file defines `const translations = { ... }` or similar.
// We can parse it by running it in a pseudo-context.
const scriptContext = { 
    window: {}, 
    document: { 
        addEventListener: () => {}, 
        querySelectorAll: () => [], 
        documentElement: { lang: '' } 
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    console: console,
    t: () => {},
    initTranslations: () => {},
    changeLanguage: () => {},
    getTranslations: () => {}
};
const vm = require('vm');
vm.createContext(scriptContext);
try {
    vm.runInContext(transContent, scriptContext);
} catch (e) {
    console.error("Failed to parse translations.js", e);
}

let existingTranslations = scriptContext.translations || scriptContext.window.translations;

if (!existingTranslations) {
    console.error("Could not extract translations from translations.js");
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

// We just want to replace the `const translations = { ... };` block in the file.
// We can use a regex to replace it, or just prepend the new object and remove the old one.
// Let's replace everything up to the function definitions if possible.
// Actually, `web/js/translations.js` has a very specific structure.
// Let's do a replace based on a string manipulation.

const startRegex = /(?:const|let|var)\s+translations\s*=\s*\{/s;
const match = transContent.match(startRegex);
if (!match) {
    console.error("Could not find start of translations object.");
    process.exit(1);
}

const startIndex = match.index;
// Find the matching closing brace
let openBraces = 0;
let endIndex = -1;
for (let i = startIndex + match[0].length - 1; i < transContent.length; i++) {
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

const newObjString = JSON.stringify(existingTranslations, null, 4);
const before = transContent.substring(0, startIndex);
const after = transContent.substring(endIndex + 1);

let finalContent = before + `const translations = ` + newObjString + after;

fs.writeFileSync(origTransFile, finalContent);
console.log('Merge complete!');
