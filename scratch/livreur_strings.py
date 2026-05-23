import re
with open('web/views/livreur.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '`' in line and re.search(r'[a-zA-ZÀ-ÿ]{3,}', line):
        print(f"{i+1}: {line.strip()}")
