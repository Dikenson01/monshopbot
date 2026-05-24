import re

for filepath in ['web/views/dashboard.html', 'web/views/catalog.html']:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # We want to find template literals (strings starting and ending with `)
    # that contain data-i18n
    
    for match in re.finditer(r'`([^`]*data-i18n[^`]*)`', content):
        snippet = match.group(0)
        # Check if the snippet does NOT contain ${t(
        if 't(' not in snippet:
            print(f"File: {filepath} \nFound dynamic data-i18n without t():\n{snippet[:200]}...\n")

