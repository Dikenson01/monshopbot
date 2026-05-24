import re
import os

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/services/i18n.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/services/i18n.js'
]

keys_fr = """        'msg_livreur_status': '🔘 Statut : <b>{status}</b>',
        'msg_livreur_active_count': '🚀 <b>VOUS AVEZ {count} COMMANDE(S) EN COURS !</b>',
        'msg_livreur_active_help': '<i>Cliquez sur "Mes livraisons en cours" pour les gérer.</i>',
        'msg_what_to_do': 'Que voulez-vous faire ?',
        'label_available': 'DISPONIBLE',
        'label_unavailable': 'INDISPONIBLE',"""

keys_en = """        'msg_livreur_status': '🔘 Status: <b>{status}</b>',
        'msg_livreur_active_count': '🚀 <b>YOU HAVE {count} ACTIVE ORDER(S) !</b>',
        'msg_livreur_active_help': '<i>Click on "Active Deliveries" to manage them.</i>',
        'msg_what_to_do': 'What would you like to do?',
        'label_available': 'AVAILABLE',
        'label_unavailable': 'UNAVAILABLE',"""

keys_es = """        'msg_livreur_status': '🔘 Estado: <b>{status}</b>',
        'msg_livreur_active_count': '🚀 <b>¡TIENES {count} PEDIDO(S) ACTIVO(S)!</b>',
        'msg_livreur_active_help': '<i>Haz clic en "Mis entregas activas" para gestionarlos.</i>',
        'msg_what_to_do': '¿Qué deseas hacer?',
        'label_available': 'DISPONIBLE',
        'label_unavailable': 'NO DISPONIBLE',"""

keys_de = """        'msg_livreur_status': '🔘 Status: <b>{status}</b>',
        'msg_livreur_active_count': '🚀 <b>SIE HABEN {count} AKTIVE BESTELLUNG(EN)!</b>',
        'msg_livreur_active_help': '<i>Klicken Sie auf "Aktive Lieferungen", um sie zu verwalten.</i>',
        'msg_what_to_do': 'Was möchten Sie tun?',
        'label_available': 'VERFÜGBAR',
        'label_unavailable': 'NICHT VERFÜGBAR',"""

for fp in files:
    if not os.path.exists(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(r"'msg_livreur_status': '🔘 Statut : <b>\{status\}</b>',", keys_fr, content, 1)
    content = re.sub(r"'msg_livreur_status': '🔘 Status: <b>\{status\}</b>',", keys_en, content, 1) # Only first one for EN
    content = re.sub(r"'msg_livreur_status': '🔘 Estado: <b>\{status\}</b>',", keys_es, content, 1)
    
    # German uses Status: {status} too, so re.sub might match English again if we aren't careful.
    # To be safe, we replace it using a more specific regex.
    content = re.sub(r"'msg_livreur_welcome': '🚴 <b>Willkommen im Kurierbereich, \{first_name\}!</b>',\s+'msg_livreur_city': '📍 Bereich: <b>\{city\}</b>',\s+'msg_livreur_status': '🔘 Status: <b>\{status\}</b>',", 
                     r"'msg_livreur_welcome': '🚴 <b>Willkommen im Kurierbereich, {first_name}!</b>',\n        'msg_livreur_city': '📍 Bereich: <b>{city}</b>',\n" + keys_de, content)

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)

print("i18n patched.")
