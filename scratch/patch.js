const fs = require('fs');
let content = fs.readFileSync('handlers/start.js', 'utf8');

// 1. Fix getMainMenuKeyboard Mini App button
content = content.replace(
    /buttons\.push\(\[Markup\.button\.webApp\(t\(user, 'btn_catalog_miniapp', '✨ CATALOGUE MINI APP ✨'\), catalogUrl\)\]\);/g,
    `if (ctx.platform !== 'whatsapp') {\n        buttons.push([Markup.button.webApp(t(user, 'btn_catalog_miniapp', '✨ CATALOGUE MINI APP ✨'), catalogUrl)]);\n    }`
);

// 2. Fix user_settings missing 'user'
content = content.replace(
    /bot\.action\('user_settings', async \(ctx\) => \{\n        await ctx\.answerCbQuery\(\);\n        const settings = ctx\.state\?\.settings \|\| await getAppSettings\(\);/g,
    `bot.action('user_settings', async (ctx) => {\n        await ctx.answerCbQuery();\n        const settings = ctx.state?.settings || await getAppSettings();\n        const user = ctx.state.user || await getUser(ctx.platform + '_' + ctx.from.id);`
);

fs.writeFileSync('handlers/start.js', content);
console.log("Patched start.js");
