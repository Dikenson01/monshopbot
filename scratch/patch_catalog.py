import re

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Out of Stock Add to Cart button with the Restock Alert button
old_button = """                <button class="btn btn-outline" style="flex:1;" onclick="closeProductModal()" data-i18n="cancel">Annuler</button>
                <button class="btn btn-accent" id="modal-add-btn" style="flex:1;" onclick="addToCart(currentProduct)" data-i18n="add">Ajouter</button>"""

new_button = """                <button class="btn btn-outline" style="flex:1;" onclick="closeProductModal()" data-i18n="cancel">Annuler</button>
                <button class="btn btn-accent" id="modal-add-btn" style="flex:1;" onclick="addToCart(currentProduct)" data-i18n="add">Ajouter</button>
                <button class="btn btn-accent" id="modal-alert-btn" style="flex:1; display:none; background:#ff9f0a; color:#000;" onclick="subscribeRestockAlert()" data-i18n="notify_restock">🔔 M'avertir du retour en stock</button>"""

content = content.replace(old_button, new_button)

# Add logic to openProductModal to switch buttons if stock <= 0
modal_logic = """            const addBtn = document.getElementById('modal-add-btn');
            const alertBtn = document.getElementById('modal-alert-btn');
            if (p.stock <= 0) {
                addBtn.style.display = 'none';
                if (alertBtn) alertBtn.style.display = 'block';
            } else {
                addBtn.style.display = 'block';
                if (alertBtn) alertBtn.style.display = 'none';
            }"""

if "const addBtn =" not in content:
    content = content.replace("document.getElementById('modal-stock').innerText = p.stock > 0 ? `${p.stock} en stock` : 'Rupture de stock';", f"document.getElementById('modal-stock').innerText = p.stock > 0 ? `${{p.stock}} en stock` : 'Rupture de stock';\n{modal_logic}")

# Add the subscribeRestockAlert function
subscribe_func = """        async function subscribeRestockAlert() {
            if (!currentProduct) return;
            const pid = currentProduct.id;
            const uid = tg.initDataUnsafe?.user?.id;
            if (!uid) {
                tg.showAlert("Veuillez utiliser Telegram pour cette action.");
                return;
            }
            try {
                const res = await fetch(`/api/products/${pid}/alert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telegramId: uid })
                });
                if (res.ok) {
                    tg.showAlert("✅ Alerte activée ! Vous recevrez un message Telegram dès que ce produit sera de nouveau en stock.");
                    closeProductModal();
                } else {
                    tg.showAlert("Erreur lors de l'abonnement à l'alerte.");
                }
            } catch (e) {
                tg.showAlert("Impossible de s'abonner à l'alerte.");
            }
        }"""

if "subscribeRestockAlert()" not in content:
    content = content.replace("function addToCart(p) {", subscribe_func + "\n\n        function addToCart(p) {")

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)

