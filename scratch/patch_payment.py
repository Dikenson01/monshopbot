import re
import os

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/services/database.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/services/database.js'
]

pattern = re.compile(
    r"\s*\{\s*id: 'mod_payment',\s*name: '💳 Paiement Stripe & Crypto Intégré',\s*category: 'MODULES SUR MESURE',\s*price: 150,\s*description: 'Encaissement automatisé et sécurisé par carte bancaire via Stripe et portefeuilles cryptographiques \(USDT/BTC/ETH\)\.',\s*image_url: 'https://placehold\.co/400x300/222/00ff88\?text=Module\+Paiement',\s*is_active: true,\s*is_featured: false,\s*priority: 5\s*\},"
)

for fp in files:
    if not os.path.exists(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content, c = pattern.subn('', content)
    print(f"Removed {c} occurrences in {fp}")
    
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)
