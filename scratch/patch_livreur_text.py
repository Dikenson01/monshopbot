import re
import os

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/handlers/start.js',
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/handlers/order_system.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/handlers/start.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/handlers/order_system.js'
]

# Replacement for start.js (line ~200)
start_js_pattern = re.compile(
    r"welcomeText = `\$\{settings\.ui_icon_livreur\} <b>Bienvenue, \$\{user\.first_name\} !</b>\\n\\n` \+\s+`📍 Secteur : <b>\$\{city\.toUpperCase\(\)\}</b>\\n` \+\s+`🔘 Statut : <b>\$\{isAvail \? \(settings\.ui_icon_success \|\| '✅'\) \+ ' DISPONIBLE' : \(settings\.ui_icon_error \|\| '❌'\) \+ ' INDISPONIBLE'\}</b>\\n\\n`;\s+if \(hasActive\) \{\s+welcomeText \+= `🚀 <b>VOUS AVEZ \$\{activeOrders\.length\} COMMANDE\(S\) EN COURS !</b>\\n\\n` \+\s+activeOrders\.map\(o => `📦 #\$\{o\.id\.slice\(-5\)\} - \$\{o\.address \|\| '\?'\}`\)\.join\('\\n'\) \+\s+`\\n\\n<i>Cliquez sur \"Mes livraisons en cours\" pour les gérer\.</i>`;\s+\}",
    re.MULTILINE | re.DOTALL
)

start_js_replacement = """
                const statusLabel = isAvail ? t(registeredUser, 'label_available', 'AVAILABLE') : t(registeredUser, 'label_unavailable', 'UNAVAILABLE');
                welcomeText = t(registeredUser, 'msg_livreur_welcome', `🚴 <b>Welcome, {first_name} !</b>`, { first_name: user.first_name }) + '\\n\\n' +
                    t(registeredUser, 'msg_livreur_city', `📍 Sector: <b>{city}</b>`, { city: city.toUpperCase() }) + '\\n' +
                    t(registeredUser, 'msg_livreur_status', `🔘 Status: <b>{status}</b>`, { status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel }) + '\\n\\n';

                if (hasActive) {
                    welcomeText += t(registeredUser, 'msg_livreur_active_count', `🚀 <b>YOU HAVE {count} ACTIVE ORDER(S) !</b>`, { count: activeOrders.length }) + '\\n\\n' +
                        activeOrders.map(o => `📦 #${o.id.slice(-5)} - ${o.address || '?'}`).join('\\n') +
                        '\\n\\n' + t(registeredUser, 'msg_livreur_active_help', `<i>Click on "Active Deliveries" to manage them.</i>`);
                }
"""

# Replacement for order_system.js (line ~2685)
order_js_pattern = re.compile(
    r"let text = `\$\{settings\.ui_icon_livreur\} <b>\$\{settings\.label_livreur \|\| 'Espace Livreur'\}</b>\\n\\n` \+\s+`👤 \$\{user\.first_name \|\| ctx\.from\.first_name\}\\n` \+\s+`📍 Secteur : <b>\$\{city\.toUpperCase\(\)\}</b>\\n` \+\s+`🔘 Statut : <b>\$\{isAvail \? \(settings\.ui_icon_success \|\| '✅'\) \+ ' DISPONIBLE' : \(settings\.ui_icon_error \|\| '❌'\) \+ ' INDISPONIBLE'\}</b>\\n\\n`;\s+if \(activeOrders\.length > 0\) \{\s+text \+= `🚨 <b>VOUS AVEZ \$\{activeOrders\.length\} COMMANDE\(S\) EN COURS !</b>\\n\\n`;\s+activeOrders\.forEach\(o => \{\s+text \+= `📦 #\$\{o\.id\.slice\(-5\)\} - \$\{o\.address\}\\n`;\s+\}\);\s+text \+= `\\n<i>Cliquez sur \"Mes livraisons en cours\" pour les gérer\.</i>\\n\\n`;\s+\}\s+text \+= `Que voulez-vous faire \?`;",
    re.MULTILINE | re.DOTALL
)

order_js_replacement = """
        const statusLabel = isAvail ? t(user, 'label_available', 'AVAILABLE') : t(user, 'label_unavailable', 'UNAVAILABLE');
        let text = t(user, 'msg_livreur_welcome', `🚴 <b>Welcome, {first_name} !</b>`, { first_name: user.first_name || ctx.from.first_name }) + '\\n\\n' +
            t(user, 'msg_livreur_city', `📍 Sector: <b>{city}</b>`, { city: city.toUpperCase() }) + '\\n' +
            t(user, 'msg_livreur_status', `🔘 Status: <b>{status}</b>`, { status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel }) + '\\n\\n';

        if (activeOrders.length > 0) {
            text += t(user, 'msg_livreur_active_count', `🚀 <b>YOU HAVE {count} ACTIVE ORDER(S) !</b>`, { count: activeOrders.length }) + '\\n\\n';
            activeOrders.forEach(o => {
                text += `📦 #${o.id.slice(-5)} - ${o.address}\\n`;
            });
            text += `\\n` + t(user, 'msg_livreur_active_help', `<i>Click on "Active Deliveries" to manage them.</i>`) + `\\n\\n`;
        }

        text += t(user, 'msg_what_to_do', `Que voulez-vous faire ?`);
"""

for fp in files:
    if not os.path.exists(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'start.js' in fp:
        content, c = start_js_pattern.subn(start_js_replacement.strip(), content)
        print(f"Patched start.js replacements: {c}")
    elif 'order_system.js' in fp:
        content, c = order_js_pattern.subn(order_js_replacement.strip(), content)
        print(f"Patched order_system.js replacements: {c}")

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)

