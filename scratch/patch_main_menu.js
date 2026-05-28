const fs = require('fs');
let content = fs.readFileSync('handlers/start.js', 'utf8');

content = content.replace(
    /const text = t\(registeredUser \|\| user, 'menu_main',/g,
    "const text = t(user, 'menu_main',"
);

content = content.replace(
    /await safeEdit\(user, text,/g,
    "await safeEdit(ctx, text,"
);

content = content.replace(
    /await safeEdit\(user, livreurText,/g,
    "await safeEdit(ctx, livreurText,"
);

fs.writeFileSync('handlers/start.js', content);
console.log("Patched showMainMenu");
