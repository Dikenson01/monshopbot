import re

with open('web/js/translations.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

missing_es = {
    "delivery_title": "ENTREGA",
    "delivery_address_caps": "DIRECCIÓN DE ENTREGA",
    "enter_another_address": "➕ Introducir otra dirección",
    "address_placeholder_auto": "Introduce calle, ciudad... (Autocompletar)",
    "address_placeholder_rt": "Introduce calle, ciudad... (Autocompletado en tiempo real)",
    "digicode_placeholder": "Intercomunicador, código de acceso...",
    "delivery_instructions_caps": "INSTRUCCIONES DE ENTREGA",
    "del_tag_car": "🚗 Bajaré al vehículo",
    "extra_instructions_placeholder": "Instrucciones adicionales para el repartidor (opcional)",
    "schedule_delivery_caps": "PROGRAMAR ENTREGA",
    "confirm_and_pay": "CONFIRMAR Y PAGAR",
    "del_tag_msg": "💬 Envíame un mensaje al llegar"
}

missing_de = {
    "delivery_title": "LIEFERUNG",
    "delivery_address_caps": "LIEFERADRESSE",
    "enter_another_address": "➕ Andere Adresse eingeben",
    "address_placeholder_auto": "Straße, Stadt eingeben... (Autovervollständigung)",
    "address_placeholder_rt": "Straße, Stadt eingeben... (Echtzeit-Autovervollständigung)",
    "digicode_placeholder": "Gegensprechanlage, Zugangscode...",
    "delivery_instructions_caps": "LIEFERANWEISUNGEN",
    "del_tag_car": "🚗 Ich komme zum Fahrzeug",
    "del_tag_msg": "💬 Senden Sie mir bei Ankunft eine Nachricht",
    "extra_instructions_placeholder": "Zusätzliche Anweisungen für den Kurier (optional)",
    "schedule_delivery_caps": "LIEFERUNG PLANEN",
    "confirm_and_pay": "BESTÄTIGEN & BEZAHLEN"
}

def inject_trans(lang_code, translations):
    global js_content
    match = re.search(f'"{lang_code}":\s*\\{{', js_content)
    if not match: return
    start_idx = match.end()
    
    injections = []
    for k, v in translations.items():
        if f'"{k}"' not in js_content[start_idx:start_idx+5000]:
            injections.append(f'        "{k}": "{v}",')
            
    if injections:
        injection_str = "\n".join(injections) + "\n"
        js_content = js_content[:start_idx] + "\n" + injection_str + js_content[start_idx:]

inject_trans('es', missing_es)
inject_trans('de', missing_de)

with open('web/js/translations.js', 'w', encoding='utf-8') as f:
    f.write(js_content)
print("Updated ES and DE translations.")
