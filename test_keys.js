const fs = require('fs');
const path = require('path');
const { translations } = require('./services/i18n');

const enKeys = Object.keys(translations.en);
console.log("Total EN keys:", enKeys.length);

const handlersDir = './handlers';
const files = fs.readdirSync(handlersDir).filter(f => f.endsWith('.js'));

let missing = 0;
files.forEach(file => {
    const content = fs.readFileSync(path.join(handlersDir, file), 'utf8');
    const regex = /t\([^,]+,\s*'([^']+)'/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        if (!enKeys.includes(key)) {
            console.log(`Missing key in EN: ${key} (from ${file})`);
            missing++;
        }
    }
});

console.log("Total missing keys:", missing);
