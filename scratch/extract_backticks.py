import re

with open('web/views/catalog.html', 'r') as f:
    html = f.read()

backtick_strings = re.findall(r'`([^`]*)`', html)

for i, s in enumerate(backtick_strings):
    # Only print if it looks like it has HTML/Text
    if '<' in s or '>' in s or any(word in s for word in ['Ajouter', 'Prix', 'Total', 'Commander']):
        pass

