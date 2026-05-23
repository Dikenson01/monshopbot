with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace '${t(' with `${t('
html = html.replace("'${t(", "`${t(")
# Replace ')}' with ')}`
html = html.replace(")}'", ")}`")

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(html)
