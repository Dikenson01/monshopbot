const fs = require('fs');

const filesToPatch = [
    'services/recommendation_engine.js',
    'services/smart_reminders.js',
    'services/notifications.js'
];

for (const file of filesToPatch) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the raw process.env.WEBAPP_URL
    content = content.replace(
        /process\.env\.WEBAPP_URL\s*\|\|\s*''/g, 
        "(process.env.RENDER_EXTERNAL_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/catalog` : 'https://monshopbot-production.up.railway.app/catalog'))"
    );
    
    content = content.replace(
        /process\.env\.WEBAPP_URL/g, 
        "(process.env.RENDER_EXTERNAL_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/catalog` : 'https://monshopbot-production.up.railway.app/catalog'))"
    );

    // Also fix the now.getTime() issue in recommendation_engine.js
    if (file === 'services/recommendation_engine.js') {
        content = content.replace(/now\.getTime\(\)/g, "now");
    }

    fs.writeFileSync(file, content);
}

console.log("Patched URLs and now.getTime().");
