const fs = require('fs');

const content = fs.readFileSync('web/js/translations.js', 'utf8');
const start = content.indexOf('const translations = {');
const objStr = content.substring(start, content.indexOf('};\n', start) + 1);
const evalStr = objStr + '\nmodule.exports = translations;';
fs.writeFileSync(__dirname + '/temp_trans.js', evalStr);
const trans = require('./temp_trans.js');

// Fix EN
trans.en.nav_chat = "Chat";
trans.en.nav_menu = "Menu";

// Fix ES
trans.es.nav_chat = "Chat";
trans.es.nav_menu = "Menú";

// Fix DE
trans.de.nav_chat = "Chat";
trans.de.nav_menu = "Menü";
trans.de.status_delivered = "GELIEFERT";
trans.de.status_delivered_short = "Geliefert";
trans.de.btn_reorder = "ERNEUT BESTELLEN";
trans.de.status_pending = "AUSSTEHEND";
trans.de.status_en_route = "UNTERWEGS";

let newContent = content.substring(0, start);
newContent += `const translations = ${JSON.stringify(trans, null, 4)};\n`;
newContent += content.substring(content.indexOf('};\n', start) + 2);

fs.writeFileSync('web/js/translations.js', newContent);
console.log("Fixed bad translations.");
