import re

filepath = 'web/views/catalog.html'
with open(filepath, 'r') as f:
    content = f.read()

# Fix 1622
content = content.replace(r"${t(\'promo_placeholder\', \'Saisir le code...\')}", r"${t('promo_placeholder', 'Saisir le code...')}")

# Fix 1710
content = content.replace(r'${t(\'del_tag_msg\', \"💬 M\'envoyer un message en arrivant\")}', r'${t("del_tag_msg", "💬 M\'envoyer un message en arrivant")}')

# Fix 1723
content = content.replace(r'${t("leave_empty_asap", "Laissez vide pour une livraison \\"Dès que possible\\"")}', r'${t("leave_empty_asap", "Laissez vide pour une livraison \"Dès que possible\"")}')

# Fix any other stray backslashes introduced
content = content.replace(r"${t('del_tag_msg', \"💬 M'envoyer un message en arrivant\")}", r"${t('del_tag_msg', '💬 M\'envoyer un message en arrivant')}")

with open(filepath, 'w') as f:
    f.write(content)
