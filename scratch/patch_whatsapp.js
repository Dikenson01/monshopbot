const fs = require('fs');
const path = require('path');

const srcServerFile = '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /TIMLEMEILLEURIDF/server.js';
const destServerFile = path.join(process.cwd(), 'server.js');

const srcContent = fs.readFileSync(srcServerFile, 'utf8');
const destContent = fs.readFileSync(destServerFile, 'utf8');

const srcLines = srcContent.split('\n');

// Extraire les Webhooks WhatsApp
let waWebhooks = [];
for (let i = 94; i <= 111; i++) waWebhooks.push(srcLines[i]);

// Extraire la suite des routes WhatsApp (à partir de 156 jusqu'à 595)
let waRoutes = [];
for (let i = 156; i <= 595; i++) waRoutes.push(srcLines[i]);

// Insérer dans server.js après le health check
const healthCheckEndIndex = destContent.indexOf('        });\n    });');

if (healthCheckEndIndex > -1) {
    const endBlock = destContent.indexOf('\n', healthCheckEndIndex + 20);
    const newDest = destContent.substring(0, endBlock + 1) + 
        '\n    // --- DEBUT INJECTION WHATSAPP ---\n' +
        waWebhooks.join('\n') + '\n' +
        waRoutes.join('\n') + 
        '\n    // --- FIN INJECTION WHATSAPP ---\n' +
        destContent.substring(endBlock + 1);
    
    fs.writeFileSync(destServerFile, newDest);
    console.log('Successfully patched server.js with WhatsApp routes');
} else {
    console.log('Could not find insertion point in server.js');
}

// -------------------------------------------------------------
// PATCH INDEX.JS
const indexFile = path.join(process.cwd(), 'index.js');
let indexContent = fs.readFileSync(indexFile, 'utf8');

const waSetupCode = `
        // --- WHATSAPP SETUP ---
        const WhatsAppSessionChannel = require('./channels/WhatsAppSessionChannel');
        let waSessionId = process.env.WHATSAPPD_SESSION_ID || process.env.WHATSAPP_SESSION_ID || process.env.SESSION_ID;
        if (!waSessionId) {
            const altKey = Object.keys(process.env).find(k => k.startsWith('WHATSAPP_SESSION_ID') || k.startsWith('WHATSAPPD_SESSION_ID'));
            if (altKey) waSessionId = process.env[altKey];
        }
        if (waSessionId) {
            const was = new WhatsAppSessionChannel({ sessionId: waSessionId, dispatcher });
            await was.initialize();
            dispatcher.registerChannel('whatsapp', was);
            console.log('[DISPATCHER] Canal whatsapp prêt');
        } else {
            console.warn('⚠️ [Système] Pas de SESSION_ID WhatsApp trouvé, canal WhatsApp inactif.');
        }
        // --- FIN WHATSAPP SETUP ---
`;

if (!indexContent.includes('WhatsAppSessionChannel')) {
    const tgInitIndex = indexContent.indexOf('console.log(\'[DISPATCHER] Canal telegram prêt\');');
    if (tgInitIndex > -1) {
        const nextLineIndex = indexContent.indexOf('\n', tgInitIndex);
        const newIndex = indexContent.substring(0, nextLineIndex + 1) + waSetupCode + indexContent.substring(nextLineIndex + 1);
        fs.writeFileSync(indexFile, newIndex);
        console.log('Successfully patched index.js with WhatsApp channel initialization');
    } else {
         console.log('Could not find insertion point in index.js');
    }
} else {
    console.log('index.js already contains WhatsAppSessionChannel');
}

