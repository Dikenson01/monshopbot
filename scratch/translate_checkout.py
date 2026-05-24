import re

filepath = 'web/views/catalog.html'
with open(filepath, 'r') as f:
    content = f.read()

replacements = {
    r'"RECAPITULATIF"': r't("summary", "RECAPITULATIF")',
    r'"VALIDER LA COMMANDE"': r't("validate_order", "VALIDER LA COMMANDE")',
    r'"LIVRAISON"': r't("delivery_title", "LIVRAISON")',
    r'"CONFIRMER & PAYER"': r't("confirm_and_pay", "CONFIRMER & PAYER")',
    r'TOTAL</span>': r'${t("total_caps", "TOTAL")}</span>',
    r'<div>TOTAL</div>': r'<div>${t("total_caps", "TOTAL")}</div>',
    r'➕ Saisir une autre adresse': r'${t("enter_another_address", "➕ Saisir une autre adresse")}',
    r'Saisir la rue, ville\.\.\. \(Autocomplétion\)': r'${t("address_placeholder_auto", "Saisir la rue, ville... (Autocomplétion)")}',
    r'Interphone, digicode\.\.\.': r'${t("digicode_placeholder", "Interphone, digicode...")}',
    r'Saisir la rue, ville\.\.\. \(Autocomplétion en temps réel\)': r'${t("address_placeholder_rt", "Saisir la rue, ville... (Autocomplétion en temps réel)")}',
    r'>ADRESSE DE LIVRAISON<': r'>${t("delivery_address_caps", "ADRESSE DE LIVRAISON")}<',
    r'>CONSIGNES DE LIVRAISON<': r'>${t("delivery_instructions_caps", "CONSIGNES DE LIVRAISON")}<',
    r'>PROGRAMMER LA LIVRAISON<': r'>${t("schedule_delivery_caps", "PROGRAMMER LA LIVRAISON")}<',
    r"💬 M'envoyer un message en arrivant": r"${t('del_tag_msg', \"💬 M'envoyer un message en arrivant\")}",
    r'🚗 Je descendrai au véhicule': r'${t("del_tag_car", "🚗 Je descendrai au véhicule")}',
    r'🏢 Je vous attendrai dans le hall': r'${t("del_tag_hall", "🏢 Je vous attendrai dans le hall")}',
    r'🤫 Ne pas sonner \(Discret\)': r'${t("del_tag_discrete", "🤫 Ne pas sonner (Discret)")}',
    r'Instructions supplémentaires pour le livreur \(facultatif\)': r'${t("extra_instructions_placeholder", "Instructions supplémentaires pour le livreur (facultatif)")}',
    r'Laissez vide pour une livraison "Dès que possible"': r'${t("leave_empty_asap", "Laissez vide pour une livraison \\\"Dès que possible\\\"")}',
    r'💰 Utiliser mon solde': r'${t("use_my_balance", "💰 Utiliser mon solde")}',
    r'✅ Code actif : -\$\{appliedPromoDiscount\}€ appliqués sur ce panier': r'${t("promo_active", "✅ Code actif : -{discount}€ appliqués sur ce panier", {discount: appliedPromoDiscount})}',
    r'Disponible : \$\{parseFloat\(userInfo\.balance\)\.toFixed\(2\)\}€': r'${t("available_balance", "Disponible : {amount}€", {amount: parseFloat(userInfo.balance).toFixed(2)})}',
    # Promo section fixes since MutationObserver handles them but let's be sure:
    r'CODE PROMO OU PARRAINAGE</span>': r'CODE PROMO OU PARRAINAGE</span>',
    r'data-i18n-placeholder="promo_placeholder" placeholder="Saisir le code..."': r'placeholder="${t(\'promo_placeholder\', \'Saisir le code...\')}"',
    r'data-i18n="apply">APPLIQUER<': r'>${t("apply", "APPLIQUER")}<'
}

for k, v in replacements.items():
    content = re.sub(k, v, content)

with open(filepath, 'w') as f:
    f.write(content)
print("Updated catalog.html")
