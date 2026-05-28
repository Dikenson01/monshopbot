const fs = require('fs');
let content = fs.readFileSync('services/dispatcher.js', 'utf8');

content = content.replace(
    /    _normalizeId\(id\) \{\n        \/\/ Pour Telegram[^\n]*\n        return String\(id\)\.replace\('telegram_', ''\);\n    \}/g,
    "    _normalizeId(id) {\n        return String(id).replace(/^(telegram|whatsapp)_/, '');\n    }"
);

fs.writeFileSync('services/dispatcher.js', content);
console.log("Patched normalizeId");
