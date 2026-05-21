import re

with open('scratch/original_catalog.html', 'r', encoding='utf-8') as f:
    orig = f.read()

# Extract renderBots function
match = re.search(r'        function renderBots\(\) \{.*?\n        \}', orig, re.DOTALL)
render_bots_fn = match.group(0)

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    target = f.read()

# Inject renderBots before renderShop
target = target.replace('function renderShop() {', f'{render_bots_fn}\n\n        function renderShop() {{')

# Update switchPage
target = target.replace("else if (p === 'shop') renderShop();", "else if (p === 'shop') renderShop();\n            else if (p === 'bots') renderBots();")

# Update cart dots logic
target = target.replace("document.getElementById('cart-dot').style.display", "document.getElementById('cart-dot').style.display = totalCount > 0 ? 'flex' : 'none';\n            const botDot = document.getElementById('cart-dot-bots'); if(botDot) botDot.style.display")

# Update start load to also render bots initially
target = target.replace('renderShop();', 'renderShop();\n            renderBots();')

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(target)

print("Logic merged")
