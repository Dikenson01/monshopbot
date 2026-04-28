
const fs = require('fs');
const path = require('path');

const BASE_DIR = '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /';
const BOTS = [
    'LE PLUG IDF',
    'La frappe IDF',
    'TIMLEMEILLEURIDF',
    'La Fabrik paris bot',
    'meet up',
    'bot client telegram',
    'Prometheus'
];

const newButton = "        [Markup.button.url('👨‍💻 Contacter le dev', 'https://t.me/Bottelegramt_bot')],";

function applyFix(botDir) {
    const adminPath = path.join(BASE_DIR, botDir, 'handlers/admin.js');
    if (!fs.existsSync(adminPath)) {
        console.log(`⚠️  ${botDir}: handlers/admin.js non trouvé.`);
        return;
    }

    let content = fs.readFileSync(adminPath, 'utf8');
    
    // Si le bouton existe déjà, on ne fait rien
    if (content.includes('Bottelegramt_bot')) {
        console.log(`⏩ ${botDir}: Déjà patché.`);
        return;
    }

    // On cherche la ligne avec main_menu dans le tableau rows/buttons
    const lines = content.split('\n');
    let patched = false;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("'main_menu'") && lines[i].includes('Markup.button.callback')) {
            // On insère avant cette ligne
            lines.splice(i, 0, newButton);
            patched = true;
            break;
        }
    }

    if (patched) {
        fs.writeFileSync(adminPath, lines.join('\n'));
        console.log(`✅ ${botDir}: Patché avec succès.`);
    } else {
        console.log(`❌ ${botDir}: Impossible de trouver l'emplacement d'insertion.`);
    }
}

console.log('🚀 Démarrage du patch Multi-Bots (Contacter le dev)...');
BOTS.forEach(applyFix);
console.log('✨ Terminé.');
