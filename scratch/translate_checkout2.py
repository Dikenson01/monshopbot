import re

filepath = 'web/views/catalog.html'
with open(filepath, 'r') as f:
    content = f.read()

replacements = {
    r'<span data-i18n="promo_title">CODE PROMO OU PARRAINAGE</span>': r'${t("promo_title", "CODE PROMO OU PARRAINAGE")}'
}

for k, v in replacements.items():
    content = re.sub(k, v, content)

with open(filepath, 'w') as f:
    f.write(content)
print("Updated catalog.html")
