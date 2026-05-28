const fs = require('fs');
let content = fs.readFileSync('handlers/order_system.js', 'utf8');

// Replace t(ctx, ...) with t(user, ...) where user is available, or get user first.
// Example: bot.action('clear_cart', async (ctx) => {
//     await ctx.answerCbQuery(t(ctx, 'msg_panier_vid', "Panier vidé 🗑️"));
content = content.replace(
    /bot\.action\('clear_cart', async \(ctx\) => \{\n        await ctx\.answerCbQuery\(t\(ctx/g,
    "bot.action('clear_cart', async (ctx) => {\n        const user = ctx.state?.user || await getUser(`${ctx.platform}_${ctx.from.id}`);\n        await ctx.answerCbQuery(t(user"
);

fs.writeFileSync('handlers/order_system.js', content);

let startContent = fs.readFileSync('handlers/start.js', 'utf8');
startContent = startContent.replace(/t\(ctx,/g, "t(user,");
startContent = startContent.replace(
    /bot\.action\('check_sub', async \(ctx\) => \{/g,
    "bot.action('check_sub', async (ctx) => {\n        const user = ctx.state?.user || await getUser(`${ctx.platform}_${ctx.from.id}`);"
);
startContent = startContent.replace(
    /bot\.action\('my_referrals', async \(ctx\) => \{\n        await ctx\.answerCbQuery\(\);\n        const settings = ctx\.state\?\.settings \|\| await getAppSettings\(\);\n        const user = ctx\.state\?\.user;/g,
    "bot.action('my_referrals', async (ctx) => {\n        await ctx.answerCbQuery();\n        const settings = ctx.state?.settings || await getAppSettings();\n        const user = ctx.state?.user || await getUser(`${ctx.platform}_${ctx.from.id}`);"
);
fs.writeFileSync('handlers/start.js', startContent);

console.log("Patched t(ctx, ...) issues");
