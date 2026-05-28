const fs = require('fs');
let content = fs.readFileSync('web/js/translations.js', 'utf8');

// Replace specific falsely-translated keys
const fixes = [
    { key: 'msg_veuillez_choisir_ou', en: 'Please select or enter an address', es: 'Por favor seleccione o introduzca una dirección', de: 'Bitte wählen Sie eine Adresse oder geben Sie eine ein' }
];

fixes.forEach(fix => {
    // en block
    content = content.replace(new RegExp(`"en":\\s*\\{[\\s\\S]*?"${fix.key}":\\s*"[^"]+"`), (match) => {
        return match.replace(new RegExp(`"${fix.key}":\\s*"[^"]+"`), `"${fix.key}": "${fix.en}"`);
    });
    // es block
    content = content.replace(new RegExp(`"es":\\s*\\{[\\s\\S]*?"${fix.key}":\\s*"[^"]+"`), (match) => {
        return match.replace(new RegExp(`"${fix.key}":\\s*"[^"]+"`), `"${fix.key}": "${fix.es}"`);
    });
    // de block
    content = content.replace(new RegExp(`"de":\\s*\\{[\\s\\S]*?"${fix.key}":\\s*"[^"]+"`), (match) => {
        return match.replace(new RegExp(`"${fix.key}":\\s*"[^"]+"`), `"${fix.key}": "${fix.de}"`);
    });
});

fs.writeFileSync('web/js/translations.js', content, 'utf8');
console.log('Fixed msg_veuillez_choisir_ou');
