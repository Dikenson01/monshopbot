const fs = require('fs');

const path = 'web/js/translations.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('MutationObserver')) {
    const observerCode = `
    // Add MutationObserver to catch dynamically added elements
    if (!window.i18nObserver && typeof document !== 'undefined') {
        window.i18nObserver = new MutationObserver((mutations) => {
            let shouldTranslate = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0) {
                    shouldTranslate = true;
                    break;
                }
            }
            if (shouldTranslate) {
                // translate only new elements or just re-run querySelectorAll
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (translations[currentLang] && translations[currentLang][key]) {
                        if (el.innerHTML !== translations[currentLang][key]) {
                            el.innerHTML = translations[currentLang][key];
                        }
                    }
                });
                document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                    const key = el.getAttribute('data-i18n-placeholder');
                    if (translations[currentLang] && translations[currentLang][key]) {
                        if (el.placeholder !== translations[currentLang][key]) {
                            el.placeholder = translations[currentLang][key];
                        }
                    }
                });
            }
        });
        window.i18nObserver.observe(document.body, { childList: true, subtree: true });
    }
`;

    // inject at the end of initTranslations
    const splitStr = "document.addEventListener('DOMContentLoaded', initTranslations);";
    if (content.includes(splitStr)) {
        // we should actually inject it inside initTranslations, or just as part of it
        // let's put it inside initTranslations
        const funcEnd = "    document.querySelectorAll('[data-i18n]').forEach(el => {";
        // Actually, just append it right after initTranslations runs, so inside initTranslations at the very end
        // wait, let's just do a regex to append to initTranslations
        content = content.replace(/(document\.querySelectorAll\('\\[data-i18n\\]'\)\.forEach\(.*?\}\);\n    \}\);)/s, "$1\n" + observerCode);
        
        // Let's do something simpler: replace `window.currentLang = currentLang;` to include the observer setup
        content = content.replace("window.currentLang = currentLang;", "window.currentLang = currentLang;\n" + observerCode);
        fs.writeFileSync(path, content);
        console.log("MutationObserver added successfully");
    } else {
        console.log("Could not find insertion point");
    }
} else {
    console.log("MutationObserver already exists");
}
