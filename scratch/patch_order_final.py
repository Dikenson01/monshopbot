import re

with open('handlers/order_system.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the ledger stock logic with adjustOrderStock
old_stock_logic = re.compile(r'            // DECREMENT STOCK & LOG TO LEDGER.*?(?=            // Clear cart)', re.DOTALL)
new_stock_logic = """            const { adjustOrderStock } = require('../services/database');
            await adjustOrderStock(order.id, 'decrement').catch(e => console.error("Stock decrement error:", e));

"""
content = re.sub(old_stock_logic, new_stock_logic, content)

# 2. Fix the Livreur Chat trigger to delete awaitingUserSupportReply
old_livreur_trigger = """        awaitingChatReply.set(`${ctx.platform}_${ctx.from.id}`, { orderId, targetId, role: targetRole });"""
new_livreur_trigger = """        try { const { awaitingUserSupportReply } = require("./admin"); if (awaitingUserSupportReply) awaitingUserSupportReply.delete(`${ctx.platform}_${ctx.from.id}`); } catch(e) {} awaitingChatReply.set(`${ctx.platform}_${ctx.from.id}`, { orderId, targetId, role: targetRole });"""
content = content.replace(old_livreur_trigger, new_livreur_trigger)

# 3. Fix the Chat Middleware to ignore commands
chat_middleware_old = """    bot.on('message', async (ctx, next) => {
        if (!ctx.from || !ctx.message || !ctx.message.text) return next();
        const userId = `${ctx.platform}_${ctx.from.id}`;"""

chat_middleware_new = """    bot.on('message', async (ctx, next) => {
        if (!ctx.from || !ctx.message || !ctx.message.text) return next();
        const userId = `${ctx.platform}_${ctx.from.id}`;
        
        // 0. Si c'est une commande (/start, /language, etc.), on l'ignore et on annule les attentes
        if (ctx.message?.text?.startsWith('/')) {
            awaitingDelayReason.delete(userId);
            awaitingChatReply.delete(userId);
            return next();
        }"""

if "// 0. Si c'est une commande" not in content:
    content = content.replace(chat_middleware_old, chat_middleware_new)

with open('handlers/order_system.js', 'w', encoding='utf-8') as f:
    f.write(content)
