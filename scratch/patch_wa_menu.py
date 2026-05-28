import re

with open("channels/WhatsAppSessionChannel.js", "r") as f:
    content = f.read()

# 1. Update sendInteractive to save the menu mapping
old_send_interactive = """        const cleanText = this._stripHTML(text);
        let textMenu = cleanText;

        // Préparer le menu textuel si des boutons sont présents
        if (buttons.length > 0) {"""

new_send_interactive = """        const cleanText = this._stripHTML(text);
        let textMenu = cleanText;

        // Préparer le menu textuel si des boutons sont présents
        if (buttons.length > 0) {
            if (!global.waMenuMapping) global.waMenuMapping = {};
            global.waMenuMapping[jid] = buttons;
"""

if old_send_interactive in content:
    content = content.replace(old_send_interactive, new_send_interactive)
else:
    print("Failed to patch sendInteractive!")

# 2. Update onMessage parsing to intercept numerical inputs
old_extract = """                const text = this._extractText(msg);
                const isAction = !!(msg.message?.listResponseMessage || msg.message?.buttonsResponseMessage);"""

new_extract = """                const text = this._extractText(msg);
                let isAction = !!(msg.message?.listResponseMessage || msg.message?.buttonsResponseMessage);
                let parsedText = text;

                // [WA-MENU-FIX] Translate numerical reply to callback_data
                if (text && /^[0-9]+$/.test(text.trim())) {
                    const idx = parseInt(text.trim(), 10) - 1;
                    if (global.waMenuMapping && global.waMenuMapping[remoteJid] && global.waMenuMapping[remoteJid][idx]) {
                        parsedText = global.waMenuMapping[remoteJid][idx].id || global.waMenuMapping[remoteJid][idx].callback_data;
                        isAction = true;
                        waLog(`[WA-Menu] Translated numerical input "${text}" -> "${parsedText}"`);
                    }
                }"""

if old_extract in content:
    content = content.replace(old_extract, new_extract)
else:
    print("Failed to patch _extractText!")

# 3. Update the messageHandler call to use parsedText
old_handler = """                if (this.messageHandler && (text || photo || video)) {
                    waLog(`[WA-In] Processing: "${text}" from ${remoteJid}`);
                    await this.messageHandler({
                        from: remoteJid,
                        name: name,
                        text: text,"""

new_handler = """                if (this.messageHandler && (parsedText || photo || video)) {
                    waLog(`[WA-In] Processing: "${parsedText}" from ${remoteJid}`);
                    await this.messageHandler({
                        from: remoteJid,
                        name: name,
                        text: parsedText,"""

if old_handler in content:
    content = content.replace(old_handler, new_handler)
else:
    print("Failed to patch messageHandler call!")

with open("channels/WhatsAppSessionChannel.js", "w") as f:
    f.write(content)

print("Patched WhatsAppSessionChannel.js successfully!")
