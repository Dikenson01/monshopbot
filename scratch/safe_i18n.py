import re

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

translations = {
    'Rechercher...': ('data-i18n-placeholder="search_placeholder"', 'Rechercher...'),
    'FINALISER LA COMMANDE': ('data-i18n="checkout"', 'FINALISER LA COMMANDE'),
    'VOTRE ADRESSE DE LIVRAISON': ('data-i18n="address_title"', 'VOTRE ADRESSE DE LIVRAISON'),
    'Rue, Numéro, Bâtiment...': ('data-i18n-placeholder="address_street"', 'Rue, Numéro, Bâtiment...'),
    'Ville': ('data-i18n-placeholder="address_city"', 'Ville'),
    'Code Postal': ('data-i18n-placeholder="address_zip"', 'Code Postal'),
    'CONTINUER': ('data-i18n="btn_continue"', 'CONTINUER'),
    'VOIR LE RÉCAPITULATIF': ('data-i18n="btn_summary"', 'VOIR LE RÉCAPITULATIF'),
    'Confirmer la commande': ('data-i18n="btn_confirm_order"', 'Confirmer la commande')
}

for fr, (attr, eng) in translations.items():
    # Only replace if not already replaced
    if attr not in content:
        content = content.replace(f'placeholder="{fr}"', f'placeholder="{fr}" {attr}')
        # For inner text, be careful with brackets
        content = content.replace(f'>{fr}<', f' {attr}>{fr}<')

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Safe i18n injection complete")
