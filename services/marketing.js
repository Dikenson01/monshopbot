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
    }
];

async function runAutomatedMarketing() {
    try {
        const settings = await getAppSettings();
        if (settings.maintenance_mode) return;

        console.log('[Marketing] Exécution de la campagne automatique...');

        // 1. Sélectionner un template aléatoire
        const template = COMMERCIAL_TEMPLATES[Math.floor(Math.random() * COMMERCIAL_TEMPLATES.length)];
        
        // 2. Récupérer les utilisateurs (on cible les clients normaux)
        const users = await getAllUsersForBroadcast(null, 'user');
        if (users.length === 0) return;

        // Pour éviter le spam massif, on peut segmenter ou envoyer à une petite partie
        // Mais ici, le client veut "proposer régulièrement", on va simuler un broadcast global intelligent
        
        const now = new Date();
        const startTime = now.toISOString();

        // Enregistrer le broadcast dans la table bot_broadcasts pour le tracking admin
        const payload = `${template.title}\n\n${template.message}|||MEDIA_URLS|||[]`;
        
        // On lance le broadcast
        await broadcastMessage('users', payload, {
            start_at: startTime,
            badge: "📣 AUTO-MARKETING"
        });

        console.log(`[Marketing] Campagne "${template.title}" lancée pour ${users.length} utilisateurs.`);
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
