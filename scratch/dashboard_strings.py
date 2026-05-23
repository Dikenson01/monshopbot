import re
with open('web/views/dashboard.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '`' in line and re.search(r'[a-zA-ZÀ-ÿ]{3,}', line) and not 't(' in line and not 'api(' in line:
        print(f"{i+1}: {line.strip()}")
