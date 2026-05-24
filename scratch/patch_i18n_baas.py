import re
import os

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/services/i18n.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/services/i18n.js'
]

keys_fr = """        'btn_view_baas': '🤖 Packs Bot & Modules',
        'btn_view_classic': '🛍️ Retour au Catalogue Classique',
        'btn_client_mode':"""

keys_en = """        'btn_view_baas': '🤖 Bot Packs & Modules',
        'btn_view_classic': '🛍️ Back to Classic Catalog',
        'btn_client_mode':"""

keys_es = """        'btn_view_baas': '🤖 Packs de Bot y Módulos',
        'btn_view_classic': '🛍️ Volver al Catálogo Clásico',
        'btn_client_mode':"""

keys_de = """        'btn_view_baas': '🤖 Bot-Pakete & Module',
        'btn_view_classic': '🛍️ Zurück zum Klassischen Katalog',
        'btn_client_mode':"""

for fp in files:
    if not os.path.exists(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(r"'btn_client_mode': '🛍 Mode Client',", keys_fr + " '🛍 Mode Client',", content)
    content = re.sub(r"'btn_client_mode': '🛍 Client Mode',", keys_en + " '🛍 Client Mode',", content)
    content = re.sub(r"'btn_client_mode': '🛍 Modo Cliente',", keys_es + " '🛍 Modo Cliente',", content)
    content = re.sub(r"'btn_client_mode': '🛍 Kundenmodus',", keys_de + " '🛍 Kundenmodus',", content)

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)
