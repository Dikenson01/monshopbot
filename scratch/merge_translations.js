const fs = require('fs');

const autoTransStr = fs.readFileSync('web/js/auto_translations.json', 'utf8');
const autoTrans = JSON.parse(autoTransStr);

const origTransFile = 'web/js/translations.js';
let transContent = fs.readFileSync(origTransFile, 'utf8');

// The translations.js file defines `const translations = { ... }` or similar.
// We can parse it by running it in a pseudo-context.
const scriptContext = { window: {} };
const vm = require('vm');
vm.createContext(scriptContext);
try {
    vm.runInContext(transContent, scriptContext);
} catch (e) {
    console.error("Failed to parse translations.js", e);
}

let existingTranslations = scriptContext.translations || window.translations;

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

// Convert back to string
const newContent = `const translations = ${JSON.stringify(existingTranslations, null, 2)};

// Exposer globalement pour le navigateur
if (typeof window !== 'undefined') {
    window.translations = translations;
}

// Exposer pour NodeJS (le script de traduction)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = translations;
}
`;

fs.writeFileSync(origTransFile, newContent);
console.log('Merge complete!');
