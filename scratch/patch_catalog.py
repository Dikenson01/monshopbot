import re

with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace demoProducts filter
old_demo = "const demoProducts = allProducts.filter(p => !(p.raw_category || p.category) || (!(p.raw_category || p.category).includes('PACK') && !(p.raw_category || p.category).includes('MODULE')));"
new_demo = """const demoProducts = allProducts.filter(p => {
    const cat = (p.raw_category || p.category || "").toUpperCase();
    return !(cat.includes('PACK') || cat.includes('MODULE') || cat.includes('BAAS'));
});"""

content = content.replace(old_demo, new_demo)

# Replace botProducts filter
old_bot = "const botProducts = allProducts.filter(p => (p.raw_category || p.category) && ((p.raw_category || p.category).includes('PACK') || (p.raw_category || p.category).includes('MODULE')));"
new_bot = """const botProducts = allProducts.filter(p => {
    const cat = (p.raw_category || p.category || "").toUpperCase();
    return cat.includes('PACK') || cat.includes('MODULE') || cat.includes('BAAS');
});"""

content = content.replace(old_bot, new_bot)

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched catalog.html")
