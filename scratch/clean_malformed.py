import re

filepath = 'web/views/dashboard.html'
with open(filepath, 'r') as f:
    html = f.read()

# Replace malformed data-i18n fragments
# e.g.  data-i18n="cancel"> data-i18n="cancel" data-i18n="cancel">Annuler</button>
# e.g.  data-i18n="orders"> data-i18n="orders">>Commandes</div>

# Match cases like `data-i18n="foo"> data-i18n="foo">` or `> data-i18n="foo">` or ` data-i18n="foo"` inside the text node
html = re.sub(r'data-i18n="[^"]*">\s*data-i18n="[^"]*">>', '>', html)
html = re.sub(r'(data-i18n="[^"]*">)(?:\s*data-i18n="[^"]*">)+', r'\1', html)
html = re.sub(r'(data-i18n="[^"]*")(?:\s+data-i18n="[^"]*")+>', r'\1>', html)
html = re.sub(r'data-i18n="[^"]*">\s*data-i18n="[^"]*">', '>', html)

# Let's use a simpler approach:
# Anything matching ` data-i18n="[a-zA-Z_]+"(>| )` that repeats
# Let's just fix the specific lines by re.sub

html = re.sub(r' data-i18n="orders">\s*data-i18n="orders">>', '>', html)
html = re.sub(r' data-i18n="livreur">\s*data-i18n="livreur">\s*data-i18n="livreur"\s*data-i18n="livreur">', '>', html)
html = re.sub(r' data-i18n="cancel">\s*data-i18n="cancel">\s*data-i18n="cancel"\s*data-i18n="cancel">', '>', html)
html = re.sub(r' data-i18n="settings">\s*data-i18n="settings">\s*data-i18n="settings"\s*data-i18n="settings">', '>', html)

with open(filepath, 'w') as f:
    f.write(html)
