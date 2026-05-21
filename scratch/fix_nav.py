import re

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_nav = """    <div class="bottom-nav">
        <div class="nav-item active" onclick="switchPage('shop', this)"><div class="nav-icon"><i class="ph-fill ph-diamond"></i></div><div class="nav-label" data-i18n="nav_shop">Shop</div></div>
        <div class="nav-item" onclick="switchPage('bots', this)"><div class="nav-icon" style="color:var(--secondary);"><i class="ph-fill ph-rocket"></i></div><div class="nav-label" data-i18n="nav_baas">BaaS</div></div>
        <div class="nav-item" onclick="switchPage('orders', this)"><div class="nav-icon"><i class="ph-fill ph-package"></i></div><div class="nav-label" data-i18n="nav_tracking">Suivi</div></div>
        <div class="nav-item" onclick="switchPage('profile', this)"><div class="nav-icon"><i class="ph-fill ph-user"></i></div><div class="nav-label" data-i18n="nav_profile">Profil</div></div>
    </div>"""

content = re.sub(r'    <div class="bottom-nav">.*?    </div>', new_nav, content, flags=re.DOTALL)

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Nav fixed")
