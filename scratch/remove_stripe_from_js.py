import re
import glob

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/services/database.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/services/database.js'
]

pattern = r"\{\s*id: 'mod_payment',.*?\s*\},"

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = re.sub(pattern, "", content, flags=re.DOTALL)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Removed mod_payment from {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
