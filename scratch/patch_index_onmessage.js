const fs = require('fs');

const path = 'index.js';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
        if (waSessionId) {
            const was = new WhatsAppSessionChannel({ sessionId: waSessionId });
            
            // Wire up dispatcher handler
            was.onMessage((msg) => {
                dispatcher.handleUpdate(was, msg).catch(err => {
                    console.error('[Main-Handler-Error] whatsapp:', err.message);
                });
            });

            // wait for init
            was.initialize().then(() => {
                console.log('[DISPATCHER] Canal whatsapp initialisé');
            }).catch(e => console.error('[DISPATCHER] Erreur whatsapp:', e.message));
            
            dispatcher.registerChannel('whatsapp', was);
            console.log('[DISPATCHER] Canal whatsapp prêt');
`;

content = content.replace(
    /if \(waSessionId\) \{[\s\S]*?console\.log\('\[DISPATCHER\] Canal whatsapp prêt'\);/,
    replacement.trim()
);

fs.writeFileSync(path, content);
console.log('Wired up onMessage in index.js');
