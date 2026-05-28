const fs = require('fs');
const path = require('path');

const translationFile = 'web/js/translations.js';
let content = fs.readFileSync(translationFile, 'utf8');

// Parse current translations
const match = content.match(/const translations = (\{[\s\S]*?\});\n\nfunction t\(/);
if (!match) {
    console.log("Could not parse translations.js");
    process.exit(1);
}

let translations;
try {
    // we need to safely eval this since it might have comments
    translations = eval("(" + match[1] + ")");
} catch (e) {
    console.error("Eval failed:", e);
    process.exit(1);
}

const langs = ['fr', 'en', 'es', 'de'];
const foundKeys = {};

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            scanDir(full);
        } else if (full.endsWith('.html') || full.endsWith('.js')) {
            const txt = fs.readFileSync(full, 'utf8');
            // matches t('key', 'default') or t("key", "default")
            const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
            let m;
            while ((m = regex.exec(txt)) !== null) {
                foundKeys[m[1]] = m[2];
            }
        }
    }
}

scanDir('web/views');
scanDir('web/js');

let added = 0;
for (const [key, fallback] of Object.entries(foundKeys)) {
    for (const lang of langs) {
        if (!translations[lang][key]) {
            translations[lang][key] = fallback; // We assign fallback for now, maybe translated
            added++;
        }
    }
}

console.log("Added", added, "missing keys");

// We'll write the updated object back
const newTransStr = JSON.stringify(translations, null, 4);
content = content.replace(match[1], newTransStr);
fs.writeFileSync(translationFile, content);

