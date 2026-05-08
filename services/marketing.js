const { getAllUsersForBroadcast, getAppSettings, saveBroadcast, getGlobalStats } = require('./database');
const { broadcastMessage } = require('./broadcast');

/**
 * MarketingService : Gère les notifications automatiques "Uber-style"
 * Objectif : Re-engager les clients inactifs et convertir les curieux.
 */

const COMMERCIAL_TEMPLATES = [
    {
        title: "💎 UNE ENVIE DE LUXE ?",
        message: "Bonjour {first_name}, notre catalogue vient d'être mis à jour avec des pépites exclusives.\n\n🚀 <b>Dépêchez-vous, les stocks s'envolent !</b>\n\n👇 Découvrez les nouveautés :",
        action: "ACCÉDER AU CATALOGUE",
        type: "catalog"
    },
    {
        title: "💰 VOTRE PORTEFEUILLE VOUS REMERCIE",
        message: "Hey {first_name}, saviez-vous que vous pouvez gagner des crédits simplement en parrainant vos amis ?\n\n🎁 <b>5€ offerts</b> pour chaque ami qui commande !\n\n👇 Obtenez votre lien :",
        action: "MON PARRAINAGE",
        type: "referral"
    },
    {
        title: "🛰 SYSTÈME SHOPTONBOT : LE FUTUR EST ICI",
        message: "Vous n'avez pas encore votre propre bot ? Déployez votre empire aujourd'hui avec <b>ShopTonBot Enterprise</b>.\n\n✅ Automatisation 24h/24\n✅ Paiements Crypto & CB\n✅ Support VIP\n\n👇 Devenir propriétaire :",
        action: "DÉPLOYER MON BOT",
        type: "pricing"
    },
    {
        title: "📦 LIVRAISON EN COURS DANS VOTRE ZONE",
        message: "Plusieurs livreurs sont actuellement actifs près de chez vous. Commandez maintenant pour une livraison en moins de 30 minutes !\n\n⚡️ <b>Flash Delivery</b> activé.",
        action: "COMMANDER MAINTENANT",
        type: "catalog"
    },
    {
        title: "🎁 CADEAU FIDÉLITÉ DÉBLOQUÉ",
        message: "Bonjour {first_name}, merci pour votre confiance. En tant que client fidèle, nous vous offrons une réduction exclusive sur votre prochaine commande !\n\n👇 Récupérer mon cadeau :",
        action: "MON CADEAU",
        type: "loyalty"
    }
];

/**
 * Strategic Hours (Paris Time)
 */
const { createPersistentMap } = require('./persistent_map');
const marketingState = createPersistentMap('marketing_state');
// lastSentHour est géré via marketingState.get('lastSentHour')

async function runAutomatedMarketing() {
    try {
        if (!marketingState.live) await marketingState.load();
        
        const settings = await getAppSettings();
        if (settings.maintenance_mode) return;

        const STRATEGIC_HOURS = [11, 14, 19, 22];
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
        const currentHour = now.getHours();
        const todayKey = now.toISOString().split('T')[0];
        
        const lastSent = marketingState.get('lastSentHour'); // Format: "YYYY-MM-DD:HH"
        if (lastSent === `${todayKey}:${currentHour}`) return;

        if (!STRATEGIC_HOURS.includes(currentHour)) return;

        console.log(`[Marketing] Strategic hour detected (${currentHour}h). Preparing campaign...`);
        marketingState.set('lastSentHour', `${todayKey}:${currentHour}`);

        // 1. Sélectionner un template adapté à l'heure
        let template;
        if (currentHour === 11) {
            template = COMMERCIAL_TEMPLATES.find(t => t.type === 'catalog') || COMMERCIAL_TEMPLATES[0];
        } else if (currentHour === 14) {
            template = COMMERCIAL_TEMPLATES.find(t => t.type === 'referral') || COMMERCIAL_TEMPLATES[1];
        } else if (currentHour === 19) {
            template = COMMERCIAL_TEMPLATES.find(t => t.type === 'catalog') || COMMERCIAL_TEMPLATES[3];
        } else {
            template = COMMERCIAL_TEMPLATES.find(t => t.type === 'pricing') || COMMERCIAL_TEMPLATES[2];
        }
        
        // 2. Récupérer les utilisateurs
        const users = await getAllUsersForBroadcast(null, 'user');
        if (users.length === 0) return;

        const startTime = now.toISOString();
        const payload = `${template.title}\n\n${template.message}|||MEDIA_URLS|||[]`;
        
        // On lance le broadcast
        await broadcastMessage('users', payload, {
            start_at: startTime,
            badge: "📣 SMART-MARKETING"
        });

        console.log(`[Marketing] Campagne "${template.title}" lancée avec succès pour ${users.length} utilisateurs.`);
    } catch (e) {
        console.error('[Marketing-Error]', e.message);
    }
}

/**
 * Envoie une notification ciblée aux paniers abandonnés (Relance 1h après)
 */
async function triggerAbandonedCartRelance(user, cart) {
    const text = `🛒 <b>PANIER ABANDONNÉ</b>\n\nBonjour ${user.first_name || 'cher client'},\n\nVous avez laissé des articles dans votre panier. Ils sont réservés pour encore quelques minutes seulement !\n\n👇 Finaliser ma commande :`;
    
    // On utilise sendMessageToUser pour une notification directe
    const { sendMessageToUser } = require('./notifications');
    await sendMessageToUser(user.id, text, {
        buttons: [
            { id: 'view_cart', title: '🛒 VOIR MON PANIER' },
            { id: 'main_menu', title: '🏠 MENU PRINCIPAL' }
        ]
    });
}

module.exports = { runAutomatedMarketing, triggerAbandonedCartRelance };
