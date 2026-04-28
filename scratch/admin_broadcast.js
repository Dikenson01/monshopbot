
const fs = require('fs');
require('dotenv').config();

const { supabase, getAppSettings } = require('../services/database');
const { TelegramChannel } = require('../channels/TelegramChannel');
const { registry } = require('../channels/ChannelRegistry');
const { sendMessageToUser } = require('../services/notifications');

async function run() {
    console.log('🚀 Initialisation des canaux pour la diffusion...');
    
    const settings = await getAppSettings();
    const token = process.env.BOT_TOKEN;
    
    if (!token) {
        console.error('❌ BOT_TOKEN manquant dans .env');
        return;
    }

    const tg = new TelegramChannel(token);
    // On simule l'initialisation du bot Telegraf interne
    const { Telegraf } = require('telegraf');
    tg.bot = new Telegraf(tg.token);
    
    registry.register(tg);
    
    console.log('🚀 Démarrage de la diffusion sécurisée (Admins uniquement)...');
    
    const rootAdminIds = String(settings.admin_telegram_id || '').match(/\d+/g) || [];
    
    // 1. Récupérer tous les admins de la DB
    const { data: dbAdmins, error } = await supabase.from('bot_users').select('id, platform').eq('is_admin', true);
    if (error) {
        console.error('❌ Erreur lors de la récupération des admins:', error.message);
        return;
    }

    const targetIds = new Set();
    dbAdmins.forEach(u => targetIds.add(u.id.replace('telegram_', '')));
    rootAdminIds.forEach(id => targetIds.add(id));

    console.log(`📊 ${targetIds.size} admins cibles identifiés.`);

    const message = `Bonjour, j’espère que tu vas bien.

Pour tout besoin relatif au bot ou si tu souhaites le faire tester à quelqu’un, rends-toi sur ce bot Telegram : @Bottelegramt_bot.

Pour que tes amis puissent tester, ils doivent cliquer sur 👉🏻 « J’aimerais en savoir plus ».

Si tu rencontres le moindre problème, clique sur 👉🏻 « Je suis déjà client ». Tu recevras une réponse dans la journée ainsi qu’une résolution de ton problème sous un maximum de 48 heures après réception de ton paiement.

Les paiements se font désormais uniquement par virement bancaire, en cryptomonnaie ou par tout autre moyen de paiement qui te conviendra, à l’exception des espèces.

Merci. Ce message n’est visible que par toi et sera le seul qui te sera envoyé, sauf si ce bot disparaît, auquel cas je te communiquerai le lien du nouveau bot.

Merci pour ta confiance, et j’espère pouvoir continuer à développer tes projets présents et futurs.

Le Devellopeur.`;

    let successCount = 0;
    for (const id of targetIds) {
        try {
            console.log(`[Sending] Admin ID: ${id}...`);
            const res = await sendMessageToUser(id, message, { parse_mode: 'HTML' });
            if (res && (res.message_id || res.success)) {
                successCount++;
                console.log(`✅ Envoyé avec succès à ${id}`);
            } else {
                console.warn(`⚠️ Échec de l'envoi à ${id}:`, res?.error || 'Inconnu');
            }
        } catch (e) {
            console.error(`❌ Erreur critique pour ${id}:`, e.message);
        }
    }

    console.log(`\n✨ DIFFUSION TERMINÉE !`);
    console.log(`✅ Total envoyés : ${successCount}/${targetIds.size}`);
    process.exit(0);
}

run();
