import json
import re

with open('web/js/auto_translations.json', 'r') as f:
    auto_trans = json.load(f)

with open('web/js/translations.js', 'r') as f:
    content = f.read()

# Find where the object starts
match = re.search(r'const\s+translations\s*=\s*(\{)', content)
if not match:
    print("Could not find start of translations object.")
    exit(1)

start_idx = match.start(1)
open_braces = 0
end_idx = -1

for i in range(start_idx, len(content)):
    if content[i] == '{':
        open_braces += 1
    elif content[i] == '}':
        open_braces -= 1
        if open_braces == 0:
            end_idx = i
            break

if end_idx == -1:
    print("Could not find end of translations object.")
    exit(1)

obj_str = content[start_idx:end_idx+1]
import ast

# The JS object might have single quotes, missing quotes on keys. We'll try to parse it with ast if it's close enough to Python syntax, but JS keys often lack quotes.
# Wait, it's safer to use a JS script, but let's just use `eval` in node by properly isolating the object string!
