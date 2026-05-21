const fs = require('fs');
const { JSDOM } = require("jsdom");

const html = fs.readFileSync('web/views/catalog.html', 'utf8');

// Extract script blocks
let scripts = [];
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
}

const combinedScript = scripts.join('\n');

const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
const window = dom.window;
window.fetch = async () => ({ ok: true, json: async () => ([]) });
window.tg = { initDataUnsafe: {}, showAlert: console.error };
window.initTranslations = () => {};
window.safeSetStorage = () => {};

try {
    window.eval(combinedScript);
    window.eval('init().then(() => console.log("Init completed successfully!")).catch(console.error)');
} catch (e) {
    console.error("Syntax or runtime error:", e);
}
