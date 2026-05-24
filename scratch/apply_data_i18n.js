const fs = require('fs');
const cheerio = require('cheerio');

const files = ['web/views/dashboard.html', 'web/views/catalog.html'];
const autoTransStr = fs.readFileSync('web/js/auto_translations.json', 'utf8');
const autoTrans = JSON.parse(autoTransStr);
const frKeys = Object.keys(autoTrans.fr || {});

for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });

    let modificationsCount = 0;

    $('*').each((i, el) => {
        if (el.name === 'script' || el.name === 'style') return;
        if ($(el).attr('data-i18n')) return;
        if ($(el).closest('.notranslate').length > 0) return;
        
        // Get direct text nodes
        const elNode = $(el).get(0);
        if (!elNode.children) return;
        
        let hasTextToTranslate = false;
        let originalText = '';
        
        // We only modify if the element contains exactly ONE text node and maybe some spaces, to not break HTML structure.
        // Actually, replacing text is easier: if it exactly matches a key, add data-i18n
        
        elNode.children.forEach(child => {
            if (child.type === 'text') {
                const text = child.data.trim();
                if (frKeys.includes(text)) {
                    hasTextToTranslate = true;
                    originalText = text;
                }
            }
        });

        if (hasTextToTranslate) {
            // We can just add data-i18n to this element.
            // But what if it has multiple text nodes? We assume the extraction only took single text node elements or handled them.
            // Let's add data-i18n safely.
            $(el).attr('data-i18n', originalText);
            // We should also add notranslate class as done in the other script? No, initTranslations will add it.
            modificationsCount++;
        }
    });

    // Also look for placeholders!
    $('*[placeholder]').each((i, el) => {
        const placeholder = $(el).attr('placeholder').trim();
        if (frKeys.includes(placeholder) && !$(el).attr('data-i18n-placeholder')) {
            $(el).attr('data-i18n-placeholder', placeholder);
            modificationsCount++;
        }
    });

    console.log(`Modified ${modificationsCount} elements in ${file}`);
    fs.writeFileSync(file, $.html());
}
