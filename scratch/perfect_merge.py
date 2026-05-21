import re

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Header & Branding
content = content.replace('<title>Farmstegridy</title>', '<title>ShopTonBot</title>')
content = content.replace('<div class="logo">Farm<span style="color:#e63946;">estegridy</span></div>', '<div class="logo">Shop<span style="color:var(--accent);">TonBot</span></div>')
content = content.replace('Membre Farmstegridy', 'Membre ShopTonBot')
content = content.replace('Client Farmstegridy', 'Client ShopTonBot')
content = content.replace("Farmestegridy", "ShopTonBot")

# 2. Add translation script
if '<script src="/js/translations.js"></script>' not in content:
    content = content.replace('</head>', '    <script src="/js/translations.js"></script>\n</head>')

# 3. Add translation initialization logic to init()
if 'initTranslations()' not in content:
    content = content.replace('function init() {', 'function init() {\n            if(typeof initTranslations==="function") initTranslations();')

# 4. Inject BaaS logic
with open('scratch/page_bots.html', 'r', encoding='utf-8') as f:
    page_bots = f.read()

if '<div id="page-bots"' not in content:
    content = content.replace('    <div id="page-orders"', f'{page_bots}\n\n    <div id="page-orders"')

# 5. Bottom Nav Replacement (Safely replacing the exact div)
new_nav = """    <div class="bottom-nav">
        <div class="nav-item active" onclick="switchPage('shop', this)"><div class="nav-icon"><i class="ph-fill ph-diamond"></i></div><div class="nav-label" data-i18n="nav_shop">Shop</div></div>
        <div class="nav-item" onclick="switchPage('bots', this)"><div class="nav-icon" style="color:var(--secondary);"><i class="ph-fill ph-rocket"></i></div><div class="nav-label" data-i18n="nav_baas">BaaS</div></div>
        <div class="nav-item" onclick="switchPage('orders', this)"><div class="nav-icon"><i class="ph-fill ph-package"></i></div><div class="nav-label" data-i18n="nav_tracking">Suivi</div></div>
        <div class="nav-item" onclick="switchPage('profile', this)"><div class="nav-icon"><i class="ph-fill ph-user"></i></div><div class="nav-label" data-i18n="nav_profile">Profil</div></div>
    </div>"""

content = re.sub(r'    <div class="bottom-nav">.*?    </div>', new_nav, content, flags=re.DOTALL)

with open('scratch/merge_logic.py', 'r') as f:
    pass # Wait, let's just implement the JS logic here directly

# 6. Inject renderBots function and logic
with open('scratch/original_catalog.html', 'r', encoding='utf-8') as f:
    orig = f.read()

match = re.search(r'        function renderBots\(\) \{.*?\n        \}', orig, re.DOTALL)
if match:
    render_bots_fn = match.group(0)
    if 'function renderBots()' not in content:
        content = content.replace('function renderShop() {', f'{render_bots_fn}\n\n        function renderShop() {{')

content = content.replace("else if (p === 'shop') renderShop();", "else if (p === 'shop') renderShop();\n            else if (p === 'bots') renderBots();")
content = content.replace("document.getElementById('cart-dot').style.display", "document.getElementById('cart-dot').style.display = totalCount > 0 ? 'flex' : 'none';\n            const botDot = document.getElementById('cart-dot-bots'); if(botDot) botDot.style.display")
content = content.replace('renderShop();', 'renderShop();\n            if(typeof renderBots==="function") renderBots();')

# Save everything cleanly
with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Merge completed seamlessly!")
