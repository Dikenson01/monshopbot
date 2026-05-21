import os

with open('scratch/page_bots.html', 'r', encoding='utf-8') as f:
    page_bots = f.read()

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Title and Header text
content = content.replace('<title>Farmstegridy</title>', '<title>ShopTonBot</title>')
content = content.replace('<span style="color:#fff;">Farm</span><span style="color:var(--accent);">stegridy</span>', '<span style="color:#fff;" data-i18n="nav_shop">Shop</span><span style="color:var(--accent);">TonBot</span>')
content = content.replace('<div class="logo">Farm<span>stegridy</span></div>', '<div class="logo">Shop<span>TonBot</span></div>')

# 2. Insert page-bots div
if '<div id="page-bots"' not in content:
    content = content.replace('    <div id="page-orders"', f'{page_bots}\n\n    <div id="page-orders"')

# 3. Add BaaS to navigation if not present
nav_str = '<div class="nav-item" onclick="switchPage(\'orders\', this)"><div class="nav-icon"><i class="ph-fill ph-package"></i></div><div class="nav-label">Suivi</div></div>'
baas_nav = '<div class="nav-item" onclick="switchPage(\'bots\', this)"><div class="nav-icon" style="color:var(--secondary);"><i class="ph-fill ph-rocket"></i></div><div class="nav-label" data-i18n="nav_baas">BaaS</div></div>'
if 'switchPage(\'bots\'' not in content:
    content = content.replace(nav_str, f'{baas_nav}\n        {nav_str}')

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Merge UI complete")
