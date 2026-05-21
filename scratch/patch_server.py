import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Restock API Endpoint
restock_endpoint = """
    app.post('/api/products/:id/alert', async (req, res) => {
        try {
            const productId = req.params.id;
            const { telegramId } = req.body;
            if (!telegramId) return res.status(400).json({ error: 'telegramId requis' });
            
            const { supabase } = require('./services/supabase');
            const { COL_USERS } = require('./services/database');
            
            const { data: user } = await supabase.from(COL_USERS).select('data').eq('telegram_id', String(telegramId)).maybeSingle();
            if (user) {
                const alerts = user.data.restock_alerts || [];
                if (!alerts.includes(productId)) {
                    alerts.push(productId);
                    const newData = { ...user.data, restock_alerts: alerts };
                    await supabase.from(COL_USERS).update({ data: newData }).eq('telegram_id', String(telegramId));
                }
            }
            res.json({ success: true });
        } catch (e) {
            console.error('Restock alert sub error:', e.message);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    app.delete('/api/products/:id',"""

if "app.post('/api/products/:id/alert'" not in content:
    content = content.replace("    app.delete('/api/products/:id',", restock_endpoint)

# Add Restock Alert Logic in PUT /api/products/:id
restock_logic = """                    }
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
                                
                                // Clean up their alerts
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

if "// RESTOCK ALERT" not in content:
    content = content.replace("                    }", restock_logic, 1)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
