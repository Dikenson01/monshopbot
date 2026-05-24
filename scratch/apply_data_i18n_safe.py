import json
import re

with open('web/js/auto_translations.json', 'r') as f:
    auto_trans = json.load(f)

fr_keys = list(auto_trans.get('fr', {}).keys())
# sort keys by length descending to match longest phrases first
fr_keys.sort(key=len, reverse=True)

for filepath in ['web/views/dashboard.html', 'web/views/catalog.html']:
    with open(filepath, 'r') as f:
        html = f.read()
    
    # We will split the HTML into chunks: script/style blocks vs the rest
    # to avoid modifying any JS code.
    pattern = r'(<(script|style)[^>]*>.*?</\2>)'
    parts = re.split(pattern, html, flags=re.DOTALL | re.IGNORECASE)
    
    new_parts = []
    modifications = 0
    
    # re.split with a group will return: text, group1, group2, text, group1, group2...
    # Actually, pattern has 2 groups. 
    # Let's use re.finditer to safely identify script and style blocks
    
    pos = 0
    output = []
    for match in re.finditer(r'<(script|style)[^>]*>.*?</\1>', html, flags=re.DOTALL | re.IGNORECASE):
        # process HTML before this block
        html_chunk = html[pos:match.start()]
        
        # In HTML chunk, we replace ">TEXT<" with " data-i18n="TEXT">TEXT<"
        # We need to be careful with newlines and spaces.
        for key in fr_keys:
            # We look for > followed by optional whitespace, then the EXACT key, then optional whitespace, then <
            # But the tag cannot already have data-i18n.
            # It's safer to just regex replace the exact key if it's sandwiched between > and <
            
            # Escape key for regex
            escaped_key = re.escape(key)
            # Find > \s* key \s* <
            regex = r'(<[^>]+(?<!data-i18n="[^"]")(?<!data-i18n=\'[^\']\')(?<!data-i18n)[^>]*>)\s*(' + escaped_key + r')\s*(</)'
            
            def repl(m):
                global modifications
                tag = m.group(1)
                if 'data-i18n' not in tag:
                    # insert data-i18n at the end of the opening tag
                    # <div class="x"> -> <div class="x" data-i18n="key">
                    tag = tag[:-1] + f' data-i18n="{key}">'
                return tag + m.group(2) + m.group(3)
                
            html_chunk_new = re.sub(regex, repl, html_chunk)
            if html_chunk_new != html_chunk:
                html_chunk = html_chunk_new
                
            # Also replace placeholders
            regex_ph = r'(<input[^>]*placeholder=")' + escaped_key + r'(")'
            def repl_ph(m):
                tag_start = m.group(1)
                if 'data-i18n-placeholder' not in tag_start:
                    return tag_start[:-1] + f'" data-i18n-placeholder="{key}" placeholder="{key}"'
                return m.group(0)
            
            html_chunk_new2 = re.sub(regex_ph, repl_ph, html_chunk)
            if html_chunk_new2 != html_chunk:
                html_chunk = html_chunk_new2
                
        output.append(html_chunk)
        output.append(match.group(0))
        pos = match.end()
        
    # Process remaining HTML after last script/style
    html_chunk = html[pos:]
    for key in fr_keys:
        escaped_key = re.escape(key)
        regex = r'(<[^>]+(?<!data-i18n)[^>]*>)\s*(' + escaped_key + r')\s*(</)'
        def repl(m):
            tag = m.group(1)
            if 'data-i18n' not in tag:
                tag = tag[:-1] + f' data-i18n="{key}">'
            return tag + m.group(2) + m.group(3)
        html_chunk = re.sub(regex, repl, html_chunk)
        
        regex_ph = r'(<input[^>]*placeholder=")' + escaped_key + r'(")'
        def repl_ph(m):
            tag_start = m.group(1)
            if 'data-i18n-placeholder' not in tag_start:
                return tag_start[:-1] + f'" data-i18n-placeholder="{key}" placeholder="{key}"'
            return m.group(0)
        html_chunk = re.sub(regex_ph, repl_ph, html_chunk)
        
    output.append(html_chunk)
    
    with open(filepath, 'w') as f:
        f.write(''.join(output))

print("Done")
