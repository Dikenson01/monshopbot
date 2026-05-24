const fs = require('fs');
const cheerio = require('cheerio');
const { translate } = require('../services/translator');

async function run() {
    const files = ['web/views/dashboard.html', 'web/views/catalog.html'];
    const textsToTranslate = new Set();
    
    for (const file of files) {
        const html = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(html);
        
        $('*').each((i, el) => {
            if (el.name === 'script' || el.name === 'style') return;
            if ($(el).attr('data-i18n')) return;
            if ($(el).closest('.notranslate').length > 0) return;
            
            // Get direct text nodes
            const elNode = $(el).get(0);
            if (!elNode.children) return;
            
            elNode.children.forEach(child => {
                if (child.type === 'text') {
                    const text = child.data.trim();
                    if (text.length > 2 && /[a-zA-ZÀ-ÿ]{2,}/.test(text) && !text.includes('${t(')) {
                        // Exclude some common variables or weird strings
                        if (text.includes('ShopTonBot') && text.length < 15) return;
                        if (text.includes('Farmstegridy') && text.length < 15) return;
                        textsToTranslate.add(text);
                    }
                }
            });
        });
    }

    const uniqueTexts = Array.from(textsToTranslate);
    console.log(`Found ${uniqueTexts.length} unique strings to translate.`);

    const langs = ['en', 'de', 'es'];
    const dictionary = { fr: {} };
    for (const text of uniqueTexts) {
        dictionary.fr[text] = text;
    }

    for (const lang of langs) {
        dictionary[lang] = {};
        console.log(`Translating to ${lang}...`);
        
        // Batch translation to avoid rate limits
        for (let i = 0; i < uniqueTexts.length; i++) {
            const text = uniqueTexts[i];
            try {
                const translated = await translate(text, lang, 'fr');
                dictionary[lang][text] = translated;
            } catch (e) {
                console.error(`Error translating: ${text}`, e.message);
                dictionary[lang][text] = text;
            }
            if (i % 20 === 0) console.log(`  ${i}/${uniqueTexts.length}`);
            // small delay to prevent rate limit
            await new Promise(r => setTimeout(r, 50));
        }
    }

    fs.writeFileSync('web/js/auto_translations.json', JSON.stringify(dictionary, null, 2));
    console.log('Done! Saved to web/js/auto_translations.json');
}

run();
