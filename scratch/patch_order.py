import re

with open('handlers/order_system.js', 'r', encoding='utf-8') as f:
    content = f.read()

reviews_logic = """
        let reviewStr = "";
        try {
            const { getReviews } = require('../services/database');
            const reviews = await getReviews(100);
            const pReviews = reviews.filter(r => String(r.product_id) === String(productId));
            if (pReviews.length > 0) {
                reviewStr = `\\n\\n💬 <b>Avis Client (${pReviews.length})</b>\\n"<i>${pReviews[0].text}</i>" - ${'⭐'.repeat(pReviews[0].rating)}`;
            }
        } catch (e) {}

        const msg = `🛒 <b>Ajout au panier</b>\\n\\n` +
            `Produit : <b>${prod.name}</b>\\n` +
            `Prix unitaire : <b>${prod.price.toFixed(2)}€</b>` +
            reviewStr +
            `\\n\\n💎 <b>Combien de sachets voulez-vous ?</b>\\n\\n` +
            `<i>Astuce: Vous pouvez écrire directement le nombre dans le chat (ex: 3)</i>`;
"""

old_msg = """        const msg = `🛒 <b>Ajout au panier</b>\\n\\n` +
            `Produit : <b>${prod.name}</b>\\n` +
            `Prix unitaire : <b>${prod.price.toFixed(2)}€</b>\\n` +
            `\\n💎 <b>Combien de sachets voulez-vous ?</b>\\n\\n` +
            `<i>Astuce: Vous pouvez écrire directement le nombre dans le chat (ex: 3)</i>`;"""

if "💬 <b>Avis Client" not in content:
    content = content.replace(old_msg, reviews_logic)

with open('handlers/order_system.js', 'w', encoding='utf-8') as f:
    f.write(content)
