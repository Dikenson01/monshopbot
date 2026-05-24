from html.parser import HTMLParser
import re
import sys

class HardcodedTextParser(HTMLParser):
    def __init__(self, filename):
        super().__init__()
        self.filename = filename
        self.in_script_or_style = False
        self.current_tags = []
        self.hardcoded_strings = []

    def handle_starttag(self, tag, attrs):
        self.current_tags.append((tag, dict(attrs)))
        if tag in ['script', 'style']:
            self.in_script_or_style = True

    def handle_endtag(self, tag):
        if self.current_tags:
            self.current_tags.pop()
        if tag in ['script', 'style']:
            self.in_script_or_style = False

    def handle_data(self, data):
        if self.in_script_or_style:
            return
            
        data = data.strip()
        if not data:
            return
            
        if not self.current_tags:
            return
            
        # Check if any parent has data-i18n
        for tag, attrs in self.current_tags:
            if 'data-i18n' in attrs:
                return

        # Check if the text contains letters and is not just symbols/numbers
        if not re.search(r'[a-zA-ZÀ-ÿ]{2,}', data):
            return
            
        # Check if the text is wrapped in t() -> not usually in raw HTML data but sometimes in JS templating within HTML
        if '${t(' in data or 't(' in data:
            return

        self.hardcoded_strings.append((self.getpos()[0], data))

for file in ['web/views/catalog.html', 'web/views/livreur.html', 'web/views/dashboard.html']:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    
    parser = HardcodedTextParser(file)
    parser.feed(html)
    
    if parser.hardcoded_strings:
        print(f"\n--- {file} ---")
        for line, text in parser.hardcoded_strings:
            # truncate text to 50 chars for output
            trunc_text = text[:80] + '...' if len(text) > 80 else text
            print(f"L{line}: {trunc_text}")

