const fs = require('fs');
let content = fs.readFileSync('services/dispatcher.js', 'utf8');

// 1. Fix docId hardcoding
content = content.replace(
    /const docId = `telegram_\$\{userId\}`;/g,
    "const actualPlatform = channel ? channel.id || channel.type || 'telegram' : 'telegram';\n                const docId = `${actualPlatform}_${userId}`;"
);

// 2. Fix getUser hardcoding
content = content.replace(
    /registeredUser = await db\.getUser\(userId, 'telegram'\);/g,
    "registeredUser = await db.getUser(userId, actualPlatform);"
);

// 3. Fix registerUser hardcoding
content = content.replace(
    /type: 'user'\n                \}, 'telegram'\);/g,
    "type: 'user'\n                }, channel ? channel.id || channel.type || 'telegram' : 'telegram');"
);

// 4. Fix _createUnifiedContext platform
content = content.replace(
    /platform: 'telegram',/g,
    "platform: channel ? channel.id || channel.type || 'telegram' : 'telegram',"
);

// 5. Also replace `telegram_${userId}` in `_isPrivilegedUser`
content = content.replace(
    /const cleanId = String\(userId\)\.replace\('telegram_', ''\);/g,
    "const cleanId = String(userId).replace(/^.*?_/, '');"
);

fs.writeFileSync('services/dispatcher.js', content);
console.log("Patched dispatcher.js platform hardcoding");
