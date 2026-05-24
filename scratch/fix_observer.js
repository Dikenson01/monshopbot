const fs = require('fs');
const path = 'web/js/translations.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the observer logic to prevent infinite loops
const oldObserverCode = `                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (translations[currentLang] && translations[currentLang][key]) {
                        if (el.innerHTML !== translations[currentLang][key]) {
                            el.innerHTML = translations[currentLang][key];
                        }
                    }
                });`;

const newObserverCode = `                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (translations[currentLang] && translations[currentLang][key]) {
                        // Use a custom attribute to prevent infinite loops
                        if (el.dataset.i18nDone !== currentLang) {
                            el.innerHTML = translations[currentLang][key];
                            el.dataset.i18nDone = currentLang;
                        }
                    }
                });`;

if (content.includes(oldObserverCode)) {
    content = content.replace(oldObserverCode, newObserverCode);
    
    // Also do placeholder
    const oldPlaceholderCode = `                document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                    const key = el.getAttribute('data-i18n-placeholder');
                    if (translations[currentLang] && translations[currentLang][key]) {
                        if (el.placeholder !== translations[currentLang][key]) {
                            el.placeholder = translations[currentLang][key];
                        }
                    }
                });`;
                
    const newPlaceholderCode = `                document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                    const key = el.getAttribute('data-i18n-placeholder');
                    if (translations[currentLang] && translations[currentLang][key]) {
                        if (el.dataset.i18nPlaceholderDone !== currentLang) {
                            el.placeholder = translations[currentLang][key];
                            el.dataset.i18nPlaceholderDone = currentLang;
                        }
                    }
                });`;
                
    content = content.replace(oldPlaceholderCode, newPlaceholderCode);
    
    fs.writeFileSync(path, content);
    console.log("Fixed infinite loop in MutationObserver");
} else {
    console.log("Could not find the observer code to replace.");
}
