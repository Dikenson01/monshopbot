const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('web/views/catalog.html', 'utf8');

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/" });
const window = dom.window;
const document = window.document;

window.Telegram = { WebApp: { initDataUnsafe: { user: { id: 123, language_code: 'fr' } }, HapticFeedback: { impactOccurred: () => {} } } };
window.tg = window.Telegram.WebApp;
window.fetch = async (url) => {
    if (url.includes('/api/products')) return { ok: true, json: async () => [{id: 1, name: 'Prod1', category: 'PACK', stock_quantity: 5}] };
    if (url.includes('/api/user-info')) return { ok: true, json: async () => ({ balance: "10.00", address: "[]", mini_app_logo: "" }) };
    if (url.includes('/api/news')) return { ok: true, json: async () => [] };
    if (url.includes('/api/user-orders')) return { ok: true, json: async () => [] };
    if (url.includes('/api/log-error')) return { catch: () => {} };
    return { ok: true, json: async () => ({}) };
};

// Also load translations.js
const transJs = fs.readFileSync('web/js/translations.js', 'utf8');
window.eval(transJs);

setTimeout(async () => {
    try {
        await window.init();
        console.log("init() finished successfully!");
    } catch(e) {
        console.error("init() failed:", e);
    }
}, 500);

