import re

with open('services/notifications.js', 'r', encoding='utf-8') as f:
    content = f.read()

restock_func = """
async function notifyUsersOfRestock(telegramIds, productName) {
    if (!telegramIds || !telegramIds.length) return;
    const { bot } = require('../index');
    if (!bot) return;

    const message = `🎉 <b>Bonne nouvelle !</b>\\n\\nLe produit <b>${productName}</b> est de nouveau en stock !\\nVous pouvez dès à présent le commander en ouvrant la Mini-App.`;

    let successCount = 0;
    for (const tid of telegramIds) {
        try {
            await bot.telegram.sendMessage(tid, message, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{ text: '🛍️ Ouvrir le Shop', web_app: { url: process.env.WEBAPP_URL } }]]
                }
            });
            successCount++;
        } catch (e) {
            console.error(`[RESTOCK] Failed to send to ${tid}:`, e.message);
        }
    }
    console.log(`[RESTOCK] Notified ${successCount}/${telegramIds.length} users about ${productName}`);
}

module.exports = {"""

if "notifyUsersOfRestock" not in content:
    content = content.replace("module.exports = {", restock_func)
    content = content.replace("module.exports = {\n", "module.exports = {\n    notifyUsersOfRestock,\n", 1)

with open('services/notifications.js', 'w', encoding='utf-8') as f:
    f.write(content)
