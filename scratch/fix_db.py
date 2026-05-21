import re

with open('services/database.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove telegram_id from the select string
content = content.replace("select('id, telegram_id, username", "select('id, username")

with open('services/database.js', 'w', encoding='utf-8') as f:
    f.write(content)
