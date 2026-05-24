import re
import os

files = [
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/handlers/start.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/handlers/start.js',
    '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/handlers/order_system.js',
    '/Users/dikenson/Desktop/Farmstegridy_bot/handlers/order_system.js'
]

for fp in files:
    if not os.path.exists(fp): continue
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix start.js block 1
    bad_str = """welcomeText = t(registeredUser, 'msg_livreur_welcome', `🚴 <b>Welcome, {first_name} !</b>`, { first_name: user.first_name }) + '

' +
                    t(registeredUser, 'msg_livreur_city', `📍 Sector: <b>{city}</b>`, { city: city.toUpperCase() }) + '
' +
                    t(registeredUser, 'msg_livreur_status', `🔘 Status: <b>{status}</b>`, { status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel }) + '

';"""

    good_str = """welcomeText = t(registeredUser, 'msg_livreur_welcome', `🚴 <b>Welcome, {first_name} !</b>`, { first_name: user.first_name }) + '\\n\\n' +
                    t(registeredUser, 'msg_livreur_city', `📍 Sector: <b>{city}</b>`, { city: city.toUpperCase() }) + '\\n' +
                    t(registeredUser, 'msg_livreur_status', `🔘 Status: <b>{status}</b>`, { status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel }) + '\\n\\n';"""
    
    content = content.replace(bad_str, good_str)

    # Fix start.js block 2
    bad_str2 = """welcomeText += t(registeredUser, 'msg_livreur_active_count', `🚀 <b>YOU HAVE {count} ACTIVE ORDER(S) !</b>`, { count: activeOrders.length }) + '

' +
                        activeOrders.map(o => `📦 #${o.id.slice(-5)} - ${o.address || '?'}`).join('
') +
                        '

' + t(registeredUser, 'msg_livreur_active_help', `<i>Click on "Active Deliveries" to manage them.</i>`);"""

    good_str2 = """welcomeText += t(registeredUser, 'msg_livreur_active_count', `🚀 <b>YOU HAVE {count} ACTIVE ORDER(S) !</b>`, { count: activeOrders.length }) + '\\n\\n' +
                        activeOrders.map(o => `📦 #${o.id.slice(-5)} - ${o.address || '?'}`).join('\\n') +
                        '\\n\\n' + t(registeredUser, 'msg_livreur_active_help', `<i>Click on "Active Deliveries" to manage them.</i>`);"""
    
    content = content.replace(bad_str2, good_str2)

    # Fix start.js block 3 (around line 485-500)
    bad_str3 = """const livreurText = t(user, 'msg_livreur_welcome', `🚴 <b>Welcome, {first_name} !</b>`, { first_name: user.first_name }) + '

' +
            t(user, 'msg_livreur_city', `📍 Sector: <b>{city}</b>`, { city: city.toUpperCase() }) + '
' +
            t(user, 'msg_livreur_status', `🔘 Status: <b>{status}</b>`, { 
                status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel
            }) + '

';"""

    good_str3 = """const livreurText = t(user, 'msg_livreur_welcome', `🚴 <b>Welcome, {first_name} !</b>`, { first_name: user.first_name }) + '\\n\\n' +
            t(user, 'msg_livreur_city', `📍 Sector: <b>{city}</b>`, { city: city.toUpperCase() }) + '\\n' +
            t(user, 'msg_livreur_status', `🔘 Status: <b>{status}</b>`, { 
                status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel
            }) + '\\n\\n';"""
    
    content = content.replace(bad_str3, good_str3)

    # Fix order_system.js block 1
    bad_str_order1 = """let text = t(user, 'msg_livreur_welcome', `🚴 <b>Welcome, {first_name} !</b>`, { first_name: user.first_name || ctx.from.first_name }) + '

' +
            t(user, 'msg_livreur_city', `📍 Sector: <b>{city}</b>`, { city: city.toUpperCase() }) + '
' +
            t(user, 'msg_livreur_status', `🔘 Status: <b>{status}</b>`, { status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel }) + '

';"""

    good_str_order1 = """let text = t(user, 'msg_livreur_welcome', `🚴 <b>Welcome, {first_name} !</b>`, { first_name: user.first_name || ctx.from.first_name }) + '\\n\\n' +
            t(user, 'msg_livreur_city', `📍 Sector: <b>{city}</b>`, { city: city.toUpperCase() }) + '\\n' +
            t(user, 'msg_livreur_status', `🔘 Status: <b>{status}</b>`, { status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel }) + '\\n\\n';"""
    
    content = content.replace(bad_str_order1, good_str_order1)

    # Fix order_system.js block 2
    bad_str_order2 = """text += t(user, 'msg_livreur_active_count', `🚀 <b>YOU HAVE {count} ACTIVE ORDER(S) !</b>`, { count: activeOrders.length }) + '

';
            activeOrders.forEach(o => {
                text += `📦 #${o.id.slice(-5)} - ${o.address}
`;
            });
            text += `
` + t(user, 'msg_livreur_active_help', `<i>Click on "Active Deliveries" to manage them.</i>`) + `

`;"""

    good_str_order2 = """text += t(user, 'msg_livreur_active_count', `🚀 <b>YOU HAVE {count} ACTIVE ORDER(S) !</b>`, { count: activeOrders.length }) + '\\n\\n';
            activeOrders.forEach(o => {
                text += `📦 #${o.id.slice(-5)} - ${o.address}\\n`;
            });
            text += `\\n` + t(user, 'msg_livreur_active_help', `<i>Click on "Active Deliveries" to manage them.</i>`) + `\\n\\n`;"""
    
    content = content.replace(bad_str_order2, good_str_order2)

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(content)

print("Syntax fixed")
