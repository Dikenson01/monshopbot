import os

catalog_path = 'web/views/catalog.html'
with open(catalog_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Promo title
content = content.replace(
    '🏷️ CODE PROMO OU PARRAINAGE</div>',
    '🏷️ <span data-i18n="promo_title">CODE PROMO OU PARRAINAGE</span></div>'
)

# Fix Promo placeholder
content = content.replace(
    'placeholder="Saisir le code..."',
    'data-i18n-placeholder="promo_placeholder" placeholder="Saisir le code..."'
)

# Fix Apply button
content = content.replace(
    '>APPLIQUER</button>',
    ' data-i18n="apply">APPLIQUER</button>'
)

# Fix Select address
content = content.replace(
    "defaultLabel.innerText = 'Sélectionnez une adresse';",
    "defaultLabel.innerText = t('select_address', 'Sélectionnez une adresse');"
)

# Fix saved addresses title
content = content.replace(
    'MES ADRESSES ENREGISTRÉES</div>',
    '${t(\'my_saved_addresses\', \'MES ADRESSES ENREGISTRÉES\')}</div>'
)

# Fix manage addresses
content = content.replace(
    '+ Gérer mes adresses</span>',
    '+ ${t(\'manage_addresses\', \'Gérer mes adresses\')}</span>'
)

# Fix Modal title
content = content.replace(
    "openCustomModal('MES ADRESSES', html);",
    "openCustomModal(t('my_addresses_title', 'MES ADRESSES'), html);"
)

with open(catalog_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("catalog.html patched.")
