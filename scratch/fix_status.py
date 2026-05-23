import re
with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("'${t('status_delivered_short')}'", "t('status_delivered_short')")
content = content.replace("'${t('status_delivered_short')} 📦'", "t('status_delivered_short') + ' 📦'")

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)
