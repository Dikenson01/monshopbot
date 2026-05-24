const fs = require('fs');

const idx = fs.readFileSync('index.js', 'utf8');

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
            // wait for init
            was.initialize().then(() => {
                console.log('[DISPATCHER] Canal whatsapp initialisé');
            }).catch(e => console.error('[DISPATCHER] Erreur whatsapp:', e.message));
            
            dispatcher.registerChannel('whatsapp', was);
            console.log('[DISPATCHER] Canal whatsapp prêt');
        } else {
            console.warn('⚠️ [Système] Pas de SESSION_ID WhatsApp trouvé, canal WhatsApp inactif.');
        }
        // --- FIN WHATSAPP SETUP ---
`;

if (!idx.includes('WhatsAppSessionChannel')) {
    const splitPoint = "server.setBotInstance(telegramChannel.bot); // Permet au dashboard d'envoyer des messages\n        }";
    if (idx.includes(splitPoint)) {
        const newIdx = idx.replace(splitPoint, splitPoint + "\n" + waSetupCode);
        fs.writeFileSync('index.js', newIdx);
        console.log("Injected WhatsApp into index.js");
    } else {
        console.log("Could not find split point in index.js");
    }
} else {
    console.log("Already has WhatsApp in index.js");
}
