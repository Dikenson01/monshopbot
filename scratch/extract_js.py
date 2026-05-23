import re

def extract_js(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
    for i, s in enumerate(scripts):
        with open(f'{filename}_{i}.js', 'w', encoding='utf-8') as out:
            out.write(s)
            
extract_js('web/views/catalog.html')
extract_js('web/views/dashboard.html')
extract_js('web/views/livreur.html')
