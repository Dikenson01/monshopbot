const fs = require('fs');
const { translate } = require('../services/translator');

async function run() {
    const content = fs.readFileSync('web/js/translations.js', 'utf8');
    const start = content.indexOf('const translations = {');
    const objStr = content.substring(start, content.indexOf('};\n', start) + 1);
    const evalStr = objStr + '\nmodule.exports = translations;';
    fs.writeFileSync(__dirname + '/temp_trans.js', evalStr);
    const trans = require('./temp_trans.js');

    const frKeys = Object.keys(trans.fr);
    const langs = ['en', 'de', 'es'];

    for (const lang of langs) {
        if (!trans[lang]) trans[lang] = {};
        const deKeys = Object.keys(trans[lang]);
        const missing = frKeys.filter(k => !deKeys.includes(k));
        
        if (missing.length === 0) {
            console.log(`No missing keys for ${lang}`);
            continue;
        }
        
        console.log(`Translating ${missing.length} missing keys for ${lang}...`);
        
        for (const k of missing) {
            const frText = trans.fr[k];
            try {
                const translated = await translate(frText, lang, 'fr');
                trans[lang][k] = translated;
                console.log(`  ${k} -> ${translated}`);
            } catch (e) {
                console.log(`  Error translating ${k}`);
                trans[lang][k] = frText;
            }
            // slight delay
            await new Promise(r => setTimeout(r, 100));
        }
    }

    // Now reconstruct the file
    let newContent = content.substring(0, start);
    newContent += `const translations = ${JSON.stringify(trans, null, 4)};\n`;
    newContent += content.substring(content.indexOf('};\n', start) + 2);
    
    fs.writeFileSync('web/js/translations.js', newContent);
    console.log("Done! translations.js updated.");
}

run();
