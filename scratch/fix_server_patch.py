import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# First, remove the wrongly placed restock logic
bad_logic_regex = re.compile(r'                    }\n                    if \(oldStock <= 0 && newStock > 0\) \{\n                        // RESTOCK ALERT.*?(?=\n                } else if \(oldProduct && req\.body\.stock !== undefined\) \{)', re.DOTALL)
content = re.sub(bad_logic_regex, '                    }', content)

# Now, find the CORRECT place to put it: inside `if (diff !== 0) {` inside `else if (oldProduct && req.body.stock !== undefined) {`
# Wait, actually let's just do it cleanly inside the `PUT /api/products/:id` route
correct_logic = """                    if (diff !== 0) {
                        try {
                            const { logStockEvent } = require('./services/database');
                            await logStockEvent(id, diff, 'restock', 'Admin Restock');
                        } catch(e) {}
                    }
                    if (oldStock <= 0 && newStock > 0) {
                        // RESTOCK ALERT
                        const { supabase } = require('./services/supabase');
                        const { COL_USERS } = require('./services/database');
                        const { notifyUsersOfRestock } = require('./services/notifications');
                        
                        try {
                            const { data: usersToNotify } = await supabase.from(COL_USERS)
                                .select('telegram_id, data')
                                .contains('data', { restock_alerts: [id] });
                                
                            if (usersToNotify && usersToNotify.length > 0) {
                                const tgIds = usersToNotify.map(u => u.telegram_id);
                                await notifyUsersOfRestock(tgIds, req.body.name);
                                
                                for (const user of usersToNotify) {
                                    let alerts = user.data.restock_alerts || [];
                                    alerts = alerts.filter(a => String(a) !== String(id));
                                    const newData = { ...user.data, restock_alerts: alerts };
                                    await supabase.from(COL_USERS).update({ data: newData }).eq('telegram_id', user.telegram_id);
                                }
                            }
                        } catch (e) {
                            console.error('[RESTOCK] Error handling restock alerts:', e);
                        }
                    }"""

content = content.replace("""                    if (diff !== 0) {
                        try {
                            const { logStockEvent } = require('./services/database');
                            await logStockEvent(id, diff, 'restock', 'Admin Restock');
                        } catch(e) {}
                    }""", correct_logic)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
