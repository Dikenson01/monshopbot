import re
import json

with open('web/js/translations.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

missing_en = {
    "delivery_title": "DELIVERY",
    "delivery_address_caps": "DELIVERY ADDRESS",
    "enter_another_address": "➕ Enter another address",
    "address_placeholder_auto": "Enter street, city... (Autocomplete)",
    "address_placeholder_rt": "Enter street, city... (Real-time autocomplete)",
    "digicode_placeholder": "Intercom, access code...",
    "delivery_instructions_caps": "DELIVERY INSTRUCTIONS",
    "del_tag_car": "🚗 I'll come down to the vehicle",
    "extra_instructions_placeholder": "Additional instructions for the courier (optional)",
    "schedule_delivery_caps": "SCHEDULE DELIVERY",
    "confirm_and_pay": "CONFIRM & PAY",
    "del_tag_msg": "💬 Send me a message upon arrival"
}

# find the "en": { ... } block
en_match = re.search(r'"en":\s*\{', js_content)
if not en_match:
    print("No 'en' block found.")
    exit(1)

start_idx = en_match.end()

# Add missing translations right after the start of "en": {
injections = []
for k, v in missing_en.items():
    # Only add if not already present
    if f'"{k}"' not in js_content[start_idx:start_idx+5000]: # rough check
        # Actually better to just do a simple string replace for the start of the "en" block
        injections.append(f'        "{k}": "{v}",')

if injections:
    injection_str = "\n".join(injections) + "\n"
    js_content = js_content[:start_idx] + "\n" + injection_str + js_content[start_idx:]
    with open('web/js/translations.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Added", len(injections), "English translations.")
else:
    print("Nothing to add.")
