import re

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('totalCount > 0', 'count > 0')

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)
