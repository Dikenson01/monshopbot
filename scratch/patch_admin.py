import re

with open('handlers/admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Export awaitingUserSupportReply
if "awaitingUserSupportReply" not in content.split("module.exports = {")[1]:
    content = content.replace("module.exports = { setupAdminHandlers, isAdmin, initAdminState, clearAuthCache };", "const awaitingUserSupportReply = new Set();\nmodule.exports = { setupAdminHandlers, isAdmin, initAdminState, clearAuthCache, awaitingUserSupportReply };")

# 2. Add Ignore Commands logic inside bot.on('message')
ignore_logic = """        // 0. Ignore commands
        if (ctx.message?.text?.startsWith('/')) {
            if (ctx.message.text === '/admin' && isAdm) return next();
            if (ctx.message.text === '/end' || ctx.message.text === '/stopchat') return next();
            return next();
        }

        const userKey = `${ctx.from.id}`;"""

if "// 0. Ignore commands" not in content:
    content = content.replace("        const userKey = `${ctx.from.id}`;", ignore_logic, 1)

# 3. Prevent conflict with Livreur Chat
livreur_conflict = """        
        // Prevent conflict with Livreur Chat
        try {
            const { awaitingChatReply } = require('./order_system');
            if (awaitingChatReply) awaitingChatReply.delete(userKey);
        } catch(e) {}

        const adminSession = Array.from(activeAdminSessions.entries()).find"""

if "// Prevent conflict with Livreur Chat" not in content:
    content = content.replace("        const adminSession = Array.from(activeAdminSessions.entries()).find", livreur_conflict, 1)

with open('handlers/admin.js', 'w', encoding='utf-8') as f:
    f.write(content)

