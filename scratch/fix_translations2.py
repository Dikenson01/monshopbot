import os

trans_path = 'web/js/translations.js'
with open(trans_path, 'r', encoding='utf-8') as f:
    content = f.read()

def insert_after(text, marker, insertion):
    if marker in text:
        return text.replace(marker, marker + insertion)
    return text

# French
fr_insert = """
        'promo_title': 'CODE PROMO OU PARRAINAGE',
        'promo_placeholder': 'Saisir le code...',
        'apply': 'APPLIQUER',
        'select_address': 'Sélectionnez une adresse',
        'my_saved_addresses': 'MES ADRESSES ENREGISTRÉES',
        'manage_addresses': 'Gérer mes adresses',
        'my_addresses_title': 'MES ADRESSES',"""
content = insert_after(content, "        'addresses': 'Adresses',", fr_insert)

# English
en_insert = """
        'promo_title': 'PROMO OR REFERRAL CODE',
        'promo_placeholder': 'Enter the code...',
        'apply': 'APPLY',
        'select_address': 'Select an address',
        'my_saved_addresses': 'MY SAVED ADDRESSES',
        'manage_addresses': 'Manage my addresses',
        'my_addresses_title': 'MY ADDRESSES',"""
content = insert_after(content, "        'addresses': 'Addresses',", en_insert)

# Spanish
es_insert = """
        'promo_title': 'CÓDIGO PROMOCIONAL O DE REFERENCIA',
        'promo_placeholder': 'Introduce el código...',
        'apply': 'APLICAR',
        'select_address': 'Selecciona una dirección',
        'my_saved_addresses': 'MIS DIRECCIONES GUARDADAS',
        'manage_addresses': 'Gestionar mis direcciones',
        'my_addresses_title': 'MIS DIRECCIONES',"""
content = insert_after(content, "        'addresses': 'Direcciones',", es_insert)

# German (Need to add addresses first)
de_insert = """
        'addresses': 'Adressen',
        'promo_title': 'PROMO- ODER EMPFEHLUNGSCODE',
        'promo_placeholder': 'Geben Sie den Code ein...',
        'apply': 'ANWENDEN',
        'select_address': 'Wählen Sie eine Adresse',
        'my_saved_addresses': 'MEINE GESPEICHERTEN ADRESSEN',
        'manage_addresses': 'Meine Adressen verwalten',
        'my_addresses_title': 'MEINE ADRESSEN',"""
content = insert_after(content, "        'login': 'Anmelden',", de_insert)

with open(trans_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("translations.js patched.")
