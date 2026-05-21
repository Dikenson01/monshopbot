import re

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/handlers/start.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/handlers/start.js'
]

for file in files:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()

        content = re.sub(
            r'(\(settings\.mini_app_url \? `\$\{settings\.mini_app_url\}/(catalog|dashboard|livreur)` : `\$\{baseDomain\}/(catalog|dashboard|livreur)`\) \+ `\?lang=\$\{langCode\}`)((?!&v=).*)',
            r'\1 + `&v=${Date.now()}`\4',
            content
        )

        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {file}")
    except Exception as e:
        print(f"Failed {file}: {e}")

