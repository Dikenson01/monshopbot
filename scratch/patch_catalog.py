import re
import os

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/handlers/order_system.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/handlers/order_system.js'
]

pattern = re.compile(
    r"async function displayCatalog\(ctx\) \{\s*const \[productsByCategory, settings\] = await Promise\.all\(\[\s*getProductsByCategory\(true\),\s*ctx\.state\?\.settings \? Promise\.resolve\(ctx\.state\.settings\) : getAppSettings\(\)\s*\]\);\s*const user = ctx\.state\?\.user \|\| await getUser\(`\$\{ctx\.platform\}_\$\{ctx\.from\.id\}`\);\s*const categories = Object\.keys\(productsByCategory\);\s*if \(categories\.length === 0\) \{",
    re.MULTILINE
)

replacement = """async function displayCatalog(ctx, isBaas = false) {
        const [productsByCategory, settings] = await Promise.all([
            getProductsByCategory(true),
            ctx.state?.settings ? Promise.resolve(ctx.state.settings) : getAppSettings()
        ]);
        const user = ctx.state?.user || await getUser(`${ctx.platform}_${ctx.from.id}`);
        
        const baasKeywords = ['BAAS', 'PACK', 'MODULE'];
        let categories = Object.keys(productsByCategory).filter(cat => {
            const isCatBaas = baasKeywords.some(kw => cat.toUpperCase().includes(kw));
            return isBaas ? isCatBaas : !isCatBaas;
        });

        if (categories.length === 0 && !isBaas) {"""


pattern_end = re.compile(
    r"buttons\.push\(\[Markup\.button\.callback\(t\(user, 'btn_back_menu', settings\.btn_back_menu \|\| '◀️ Retour Menu'\), 'main_menu'\)\]\);\s*await safeEdit\(ctx, text, Markup\.inlineKeyboard\(buttons\)\);\s*\}",
    re.MULTILINE
)

replacement_end = """        if (!isBaas) {
            const hasBaas = Object.keys(productsByCategory).some(cat => baasKeywords.some(kw => cat.toUpperCase().includes(kw)));
            if (hasBaas) {
                buttons.push([Markup.button.callback(t(user, 'btn_view_baas', '🤖 Packs Bot & Modules'), 'view_catalog_baas')]);
            }
        } else {
            buttons.push([Markup.button.callback(t(user, 'btn_view_classic', '🛍️ Retour au Catalogue Classique'), 'view_catalog')]);
        }

        buttons.push([Markup.button.callback(t(user, 'btn_back_menu', settings.btn_back_menu || '◀️ Retour Menu'), 'main_menu')]);

        await safeEdit(ctx, text, Markup.inlineKeyboard(buttons));
    }

    bot.action('view_catalog_baas', async (ctx) => {
        try { await ctx.answerCbQuery().catch(() => {}); } catch(e) {}
        await displayCatalog(ctx, true);
    });"""

for fp in files:
    if not os.path.exists(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    content, c1 = pattern.subn(replacement, content, count=1)
    content, c2 = pattern_end.subn(replacement_end, content, count=1)
    
    print(f"Patched {fp}: start={c1}, end={c2}")
    
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)
