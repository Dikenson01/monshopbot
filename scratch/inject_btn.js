const fs = require('fs');

const path = 'web/views/dashboard.html';
let content = fs.readFileSync(path, 'utf8');

const waConnectorBtn = `
                <div style="margin-top:30px; padding:20px; border:1px solid #25D366; border-radius:10px; background:rgba(37,211,102,0.05); display:flex; align-items:center; justify-content:space-between;">
                    <div>
                        <h4 style="color:#25D366; margin:0 0 5px 0;">🔗 Connexion WhatsApp</h4>
                        <p style="font-size:13px; opacity:0.8; margin:0;">Gérer la connexion de votre compte WhatsApp (QR ou Code)</p>
                    </div>
                    <a href="#" onclick="window.open('/wa-connector?token=' + localStorage.getItem('admin_token'), '_blank')" class="btn btn-sm" style="background:#25D366; color:#000; padding: 10px 20px; font-weight: 700; text-decoration:none;">
                        <span>📱 Appareiller WhatsApp</span>
                    </a>
                </div>
`;

content = content.replace(
    '<div style="margin-top:30px; padding-top:20px; border-top:1px solid var(--border); display:flex; justify-content:flex-end;">',
    waConnectorBtn + '\n                <div style="margin-top:30px; padding-top:20px; border-top:1px solid var(--border); display:flex; justify-content:flex-end;">'
);

fs.writeFileSync(path, content);
console.log('Injected WA button');
