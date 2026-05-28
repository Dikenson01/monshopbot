import re
import os

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/server.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/server.js'
]

qr_route_pattern = re.compile(
    r"app\.get\('/whatsapp-qr', \(req, res\) => \{\s*const qrPath = path\.join\(process\.cwd\(\), 'whatsapp_qr\.png'\);\s*if \(fs\.existsSync\(qrPath\)\) \{"
)
qr_route_replacement = """app.get('/whatsapp-qr', (req, res) => {
        const waSession = _dispatcher.channels.get('whatsapp');
        if (waSession && waSession.lastQR) {
            try {
                const base64Data = waSession.lastQR.replace(/^data:image\\/png;base64,/, "");
                const imgBuffer = Buffer.from(base64Data, 'base64');
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                return res.send(imgBuffer);
            } catch (e) {
                console.error("Error sending QR:", e);
            }
        }
        
        const qrPath = path.join(process.cwd(), 'whatsapp_qr.png');
        if (fs.existsSync(qrPath)) {"""


pairing_html_pattern = re.compile(
    r'<div class="pairing-label">Entrez ce code pour \$\{phoneNumber\}</div>'
)
pairing_html_replacement = '<div class="pairing-label">${phoneNumber ? `Entrez ce code pour ` + phoneNumber : `QR CODE SEULEMENT`}</div>'

for fp in files:
    if not os.path.exists(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    content, c1 = qr_route_pattern.subn(qr_route_replacement, content, count=1)
    content, c2 = pairing_html_pattern.subn(pairing_html_replacement, content, count=1)
    
    print(f"Patched {fp}: qr_route={c1}, pairing_html={c2}")
    
    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)
