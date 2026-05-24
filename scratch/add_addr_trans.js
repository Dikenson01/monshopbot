const fs = require('fs');

const content = fs.readFileSync('web/js/translations.js', 'utf8');
const start = content.indexOf('const translations = {');
const objStr = content.substring(start, content.indexOf('};\n', start) + 1);
const evalStr = objStr + '\nmodule.exports = translations;';
fs.writeFileSync(__dirname + '/temp_trans.js', evalStr);
const trans = require('./temp_trans.js');

const newKeys = {
    fr: {
        no_saved_addr: "Aucune adresse enregistrée.",
        click_addr_edit: "💡 Cliquez sur une adresse pour l'éditer ou la définir par défaut",
        addr_type: "Type d'adresse",
        addr_home: "Domicile",
        addr_office: "Bureau",
        addr_friend: "Ami(e)",
        addr_hotel: "Hôtel",
        addr_other: "Autre",
        add_address: "AJOUTER UNE ADRESSE"
    },
    en: {
        no_saved_addr: "No saved addresses.",
        click_addr_edit: "💡 Click an address to edit or set as default",
        addr_type: "Address type",
        addr_home: "Home",
        addr_office: "Office",
        addr_friend: "Friend",
        addr_hotel: "Hotel",
        addr_other: "Other",
        add_address: "ADD AN ADDRESS"
    },
    es: {
        no_saved_addr: "No hay direcciones guardadas.",
        click_addr_edit: "💡 Haz clic en una dirección para editarla o establecerla como predeterminada",
        addr_type: "Tipo de dirección",
        addr_home: "Casa",
        addr_office: "Oficina",
        addr_friend: "Amigo/a",
        addr_hotel: "Hotel",
        addr_other: "Otro",
        add_address: "AÑADIR UNA DIRECCIÓN"
    },
    de: {
        no_saved_addr: "Keine gespeicherten Adressen.",
        click_addr_edit: "💡 Klicken Sie auf eine Adresse, um sie zu bearbeiten oder als Standard festzulegen",
        addr_type: "Adresstyp",
        addr_home: "Zuhause",
        addr_office: "Büro",
        addr_friend: "Freund(in)",
        addr_hotel: "Hotel",
        addr_other: "Andere",
        add_address: "ADRESSE HINZUFÜGEN"
    }
};

for (const lang of ['fr', 'en', 'es', 'de']) {
    for (const [k, v] of Object.entries(newKeys[lang])) {
        trans[lang][k] = v;
    }
}

let newContent = content.substring(0, start);
newContent += `const translations = ${JSON.stringify(trans, null, 4)};\n`;
newContent += content.substring(content.indexOf('};\n', start) + 2);

fs.writeFileSync('web/js/translations.js', newContent);
console.log("Address translations added!");
