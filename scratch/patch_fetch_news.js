const fs = require('fs');
let content = fs.readFileSync('web/views/catalog.html', 'utf-8');

content = content.replace(
    "fetch('/api/news'),",
    "fetch(`/api/news?lang=${window.currentLang || 'fr'}`),"
);

content = content.replace(
    "const resNews = await fetch('/api/news');",
    "const resNews = await fetch(`/api/news?lang=${window.currentLang || 'fr'}`);"
);

fs.writeFileSync('web/views/catalog.html', content, 'utf-8');
console.log("Patched catalog.html to pass lang to /api/news");
