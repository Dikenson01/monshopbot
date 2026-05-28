const fs = require('fs');
let content = fs.readFileSync('channels/WhatsAppSessionChannel.js', 'utf8');

const groupCheck = `
                // [🛡️ CRITIQUE] Ignorer les groupes WhatsApp
                if (remoteJid?.endsWith('@g.us')) {
                    waLog(\`[WA-MSG] SKIP: Group message (\${remoteJid})\`);
                    continue;
                }
                
                const selfJidClean = selfJid?.split(':')[0]?.split('@')[0];
`;

content = content.replace("const selfJidClean = selfJid?.split(':')[0]?.split('@')[0];", groupCheck);

fs.writeFileSync('channels/WhatsAppSessionChannel.js', content, 'utf8');
console.log('Fixed WA group ignore');
