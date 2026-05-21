import re

with open('services/database.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix COL_USERS select query to include telegram_id
old_query = "let query = supabase.from(COL_USERS).select('id, username, first_name, last_name, is_blocked, is_livreur, platform');"
new_query = "let query = supabase.from(COL_USERS).select('id, telegram_id, username, first_name, last_name, is_blocked, is_livreur, platform');"
content = content.replace(old_query, new_query)

# Fix product ID extraction
old_pid = "const productId = item.productId;"
new_pid = "const productId = item.productId || item.id;"
content = content.replace(old_pid, new_pid)

# Add stock alert logic in adjustOrderStock
old_adjust = """                await supabase.from(COL_PRODUCTS).update({ stock: newStock }).eq('id', productId);"""
new_adjust = """                const updates = { stock: newStock };
                
                let alertMsg = null;
                if (action === 'decrement') {
                    if (newStock <= 0 && p.stock > 0) {
                        updates.is_active = false;
                        updates.is_available = false;
                        alertMsg = `🚫 <b>Rupture de Stock</b>\\nLe produit <b>${p.name}</b> est épuisé. Il a été automatiquement masqué du catalogue du bot.`;
                    } else if (newStock <= 2 && p.stock > 2) {
                        alertMsg = `⚠️ <b>Alerte Stock Critique (${newStock} restants)</b>\\nLe produit <b>${p.name}</b> n'a plus que ${newStock} unités en stock ! Veuillez réapprovisionner au plus vite.`;
                    } else if (newStock <= 5 && p.stock > 5) {
                        alertMsg = `⚠️ <b>Alerte Stock Bas (${newStock} restants)</b>\\nLe produit <b>${p.name}</b> n'a plus que ${newStock} unités en stock. Pensez à réapprovisionner !`;
                    }
                }
                
                await supabase.from(COL_PRODUCTS).update(updates).eq('id', productId);
                
                if (alertMsg) {
                    try {
                        const { notifyAdmins } = require('./notifications');
                        await notifyAdmins(null, alertMsg);
                    } catch(err) {
                        console.error("Error sending stock alert from DB:", err.message);
                    }
                }"""
content = content.replace(old_adjust, new_adjust)

with open('services/database.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("database.js patched successfully.")
