import re
import json
import os

files_to_scan = []
for root, _, files in os.walk('web'):
    for f in files:
        if f.endswith('.html') or f.endswith('.js'):
            files_to_scan.append(os.path.join(root, f))

found_keys = {}
# Match t("key", "fallback") or t('key', 'fallback')
pattern = re.compile(r't\s*\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']')

for f in files_to_scan:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        for match in pattern.finditer(content):
            key = match.group(1)
            fallback = match.group(2)
            found_keys[key] = fallback

print(f"Found {len(found_keys)} keys used in source code.")

with open('web/js/translations.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Extract the translations object
obj_match = re.search(r'const translations = (\{.*?\});\n\nfunction t\(', js_content, re.DOTALL)
if not obj_match:
    print("Could not find translations object")
    exit(1)

import ast

def parse_js_obj(js_string):
    # This might be tricky if it's not strict JSON
    import json
    # A lot of js strings can be parsed by json if keys are quoted
    try:
        return json.loads(js_string)
    except:
        return None

translations = parse_js_obj(obj_match.group(1))
if not translations:
    print("Could not parse JSON. Will try to extract keys manually.")
    exit(1)

langs = ['fr', 'en', 'es', 'de']
added = 0
for lang in langs:
    if lang not in translations: continue
    for k, fallback in found_keys.items():
        if k not in translations[lang]:
            # Provide English translation for missing if lang == en
            # Actually just assign the fallback for now, we will print them
            translations[lang][k] = fallback
            added += 1

print(f"Added {added} missing keys across languages.")

new_json = json.dumps(translations, indent=4, ensure_ascii=False)
js_content = js_content[:obj_match.start(1)] + new_json + js_content[obj_match.end(1):]

with open('web/js/translations.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Saved.")
