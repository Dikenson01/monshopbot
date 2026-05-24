const fs = require('fs');

const path = 'web/js/translations.js';
let content = fs.readFileSync(path, 'utf8');

// evaluate the file to see if there are any syntax errors
try {
    const acorn = require('acorn');
    acorn.parse(content, { ecmaVersion: 2020 });
    console.log("translations.js syntax OK.");
} catch (e) {
    console.error("translations.js syntax error:", e);
}

// verify if 'de' translations exist
if (content.includes('"de": {')) {
    console.log("German translations exist.");
} else {
    console.log("No German translations found!");
}

if (content.includes('MutationObserver')) {
    console.log("MutationObserver is present.");
} else {
    console.log("MutationObserver is missing.");
}
