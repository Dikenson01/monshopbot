import os

views_dir = 'web/views'
html_files = [f for f in os.listdir(views_dir) if f.endswith('.html')]

html_replacements = {
    '>Shop<': ' data-i18n="nav_shop">>Shop<',
    '>BaaS<': ' data-i18n="nav_baas">>BaaS<',
    '>Suivi<': ' data-i18n="nav_tracking">>Suivi<',
    '>Profil<': ' data-i18n="nav_profile">>Profil<',
    '>Passer la commande<': ' data-i18n="checkout">>Passer la commande<',
    '>Panier<': ' data-i18n="cart">>Panier<',
    '>Adresse de livraison<': ' data-i18n="address_title">>Adresse de livraison<',
    ">Confirmer l'adresse<": """ data-i18n="confirm_address">>Confirmer l'adresse<""",
    'placeholder="Rechercher..."': 'placeholder="Rechercher..." data-i18n="search"',
    '>Tableau de bord<': ' data-i18n="dashboard">>Tableau de bord<',
    '>Paramètres<': ' data-i18n="settings">>Paramètres<',
    '>Historique<': ' data-i18n="history">>Historique<',
    '>Ma Boutique<': ' data-i18n="my_shop">>Ma Boutique<',
    '>Ajouter au panier<': ' data-i18n="add_to_cart">>Ajouter au panier<',
    '>Livreur<': ' data-i18n="livreur">>Livreur<',
    '>Retour<': ' data-i18n="back">>Retour<',
    '>Annuler<': ' data-i18n="cancel">>Annuler<',
    '>Confirmer<': ' data-i18n="confirm">>Confirmer<',
    '>Oui<': ' data-i18n="yes">>Oui<',
    '>Non<': ' data-i18n="no">>Non<',
    '>Livraison<': ' data-i18n="delivery">>Livraison<',
    '>Retrait<': ' data-i18n="pickup">>Retrait<'
}

js_replacements = {
    '"Articles ajoutés au panier !"': 't("added_to_cart_notif")',
    "'Articles ajoutés au panier !'": 't("added_to_cart_notif")',
    '"Aucun produit disponible pour le moment."': 't("empty_catalog")',
    "'Aucun produit disponible pour le moment.'": 't("empty_catalog")',
    '"Chargement..."': 't("loading")',
    "'Chargement...'": 't("loading")',
    '"Erreur"': 't("error")',
    "'Erreur'": 't("error")',
    '"Succès"': 't("success")',
    "'Succès'": 't("success")'
}

for filename in html_files:
    filepath = os.path.join(views_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if '<script src="/js/translations.js"></script>' not in content:
        content = content.replace('</head>', '    <script src="/js/translations.js"></script>\n</head>')
        
    for old, new in html_replacements.items():
        content = content.replace(old, new)
        
    for old, new in js_replacements.items():
        content = content.replace(old, new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("HTML files patched!")
