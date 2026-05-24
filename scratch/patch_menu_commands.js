const fs = require('fs');
const file = 'handlers/start.js';
let content = fs.readFileSync(file, 'utf8');

const commandsPatch = `
    await updateMenuButton(ctx, user, settings);
    
    // Force command translation per user when returning to menu
    if (ctx.telegram && ctx.chat) {
        const cmdLang = user?.language_code || 'fr';
        const cmds = {
            'en': [
                { command: 'start', description: '🏠 Start the bot / Home' },
                { command: 'menu', description: '🛒 View catalog' },
                { command: 'orders', description: '📦 My orders' },
                { command: 'help', description: '❓ Help and support' }
            ],
            'de': [
                { command: 'start', description: '🏠 Bot starten / Startseite' },
                { command: 'menu', description: '🛒 Katalog ansehen' },
                { command: 'orders', description: '📦 Meine Bestellungen' },
                { command: 'help', description: '❓ Hilfe und Support' }
            ],
            'es': [
                { command: 'start', description: '🏠 Iniciar el bot / Inicio' },
                { command: 'menu', description: '🛒 Ver catálogo' },
                { command: 'orders', description: '📦 Mis pedidos' },
                { command: 'help', description: '❓ Ayuda y soporte' }
            ],
            'fr': [
                { command: 'start', description: '🏠 Lancer le bot / Accueil' },
                { command: 'menu', description: '🛒 Voir le catalogue' },
                { command: 'orders', description: '📦 Mes commandes' },
                { command: 'help', description: '❓ Aide et support' }
            ]
        };
        const userCmds = cmds[cmdLang] || cmds['fr'];
        await ctx.telegram.setMyCommands(userCmds, { scope: { type: 'chat', chat_id: ctx.chat.id } }).catch(()=>{});
    }
`;

content = content.replace(
    'await updateMenuButton(ctx, user, settings);',
    commandsPatch
);

fs.writeFileSync(file, content);
console.log('Patched showMainMenu in start.js');
