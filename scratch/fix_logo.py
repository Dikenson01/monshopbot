import re

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<span style="color:#fff;">Farm</span><span style="color:var(--accent);">estegridy</span>', '<span style="color:#fff;" data-i18n="nav_shop">Shop</span><span style="color:var(--accent);">TonBot</span>')

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)
