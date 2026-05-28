import re
import os
import json

# Extract all keys used in web frontend
files_to_scan = []
for root, _, files in os.walk('web'):
    for f in files:
        if f.endswith('.html') or f.endswith('.js'):
            files_to_scan.append(os.path.join(root, f))

found_keys = {}
pattern = re.compile(r't\s*\(\s*["\']([^"\']+)["\']\s*,\s*["\']([^"\']+)["\']')

for f in files_to_scan:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        for match in pattern.finditer(content):
            key = match.group(1)
            fallback = match.group(2)
            found_keys[key] = fallback

# Read translations.js
with open('web/js/translations.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

langs = ['en', 'es', 'de']
missing_per_lang = {lang: {} for lang in langs}

for lang in langs:
    # Find the block for the language
    lang_match = re.search(f'"{lang}":\s*\\{{', js_content)
    if not lang_match: continue
    start_idx = lang_match.end()
    
    # Very rudimentary check: just see if "key" is in the next ~10000 chars
    # We can be more precise by extracting the block
    block = js_content[start_idx:start_idx+15000] 
    for k, fallback in found_keys.items():
        if f'"{k}"' not in block:
            missing_per_lang[lang][k] = fallback

# Print the missing keys
for lang in langs:
    missing = missing_per_lang[lang]
    print(f"\n--- Missing in {lang.upper()} ({len(missing)} keys) ---")
    for k, v in missing.items():
        print(f'"{k}": "{v}"')

