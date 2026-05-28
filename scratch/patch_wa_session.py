import re
import os

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/index.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/index.js'
]

pattern = re.compile(
    r"let waSessionId = process\.env\.WHATSAPPD_SESSION_ID \|\| process\.env\.WHATSAPP_SESSION_ID \|\| process\.env\.SESSION_ID;\s*if \(!waSessionId\) \{\s*const altKey = Object\.keys\(process\.env\)\.find\(k => k\.startsWith\('WHATSAPP_SESSION_ID'\) \|\| k\.startsWith\('WHATSAPPD_SESSION_ID'\)\);\s*if \(altKey\) waSessionId = process\.env\[altKey\];\s*else waSessionId = 'monshopbot_wa'; // Valeur par défaut pour toujours démarrer WhatsApp\s*\}"
)

replacement = """let waSessionId = process.env.WHATSAPPD_SESSION_ID || process.env.WHATSAPP_SESSION_ID || process.env.SESSION_ID;
        if (!waSessionId) {
            const altKey = Object.keys(process.env).find(k => (k.startsWith('WHATSAPP_SESSION_ID') || k.startsWith('WHATSAPPD_SESSION_ID')) && process.env[k]);
            if (altKey) waSessionId = process.env[altKey];
        }
        if (!waSessionId) waSessionId = 'monshopbot_wa'; // Force fallback if empty"""

for fp in files:
    if not os.path.exists(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    content, c = pattern.subn(replacement, content, count=1)
    print(f"Patched {fp}: {c}")
    
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)
