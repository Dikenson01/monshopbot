import re

with open('web/js/translations.js', 'r') as f:
    trans_content = f.read()

# get all keys defined in fr
fr_section = re.search(r"fr:\s*\{([^}]+)\}", trans_content)
if fr_section:
    defined_keys = re.findall(r"['\"]([a-zA-Z0-9_]+)['\"]\s*:", fr_section.group(1))
    defined_keys = set(defined_keys)
else:
    defined_keys = set()

print(f"Defined keys in FR: {len(defined_keys)}")

missing_keys = set()
for file in ['web/views/catalog.html', 'web/views/livreur.html', 'web/views/dashboard.html']:
    with open(file, 'r') as f:
        content = f.read()
    
    # find all t('key', 'default')
    matches = re.findall(r"t\(\s*['\"]([a-zA-Z0-9_]+)['\"]\s*,", content)
    for m in matches:
        if m not in defined_keys:
            missing_keys.add(m)

print("Missing keys:", missing_keys)
