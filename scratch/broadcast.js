require('dotenv').config();
const { Telegraf } = require('telegraf');
const { supabase } = require('../services/database'); // Adjust path based on execution dir

const bot = new Telegraf(process.env.BOT_TOKEN);

async function broadcast() {
    console.log('Fetching users from Supabase...');
    const { data: users, error } = await supabase.from('bot_users').select('id');
    
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No users found to broadcast to.');
        return;
    }

    const message = `🚀 <b>NOUVELLES FONCTIONNALITÉS DISPONIBLES !</b>\n\n` +
        `Améliorez votre bot avec nos derniers ajouts exclusifs pour augmenter vos ventes et fidéliser vos clients :\n\n` +
        `⚡️ <b>Bouton "Achat Express"</b> : Commande en 1 clic pour vos clients réguliers. Le bot mémorise leur commande et réduit le temps d'achat à 3 secondes.\n` +
        `🏆 <b>Programme VIP Évolutif</b> : Statuts Bronze/Silver/Gold. Passé un certain montant d'achat, le client débloque des remises automatiques (ex: -5% pour les membres Gold).\n` +
        `📍 <b>Suivi Livreur Visuel</b> : Au lieu d'un texte, vos clients voient une mini-carte WebApp avec l'approche du livreur (Style Uber Eats).\n` +
        `⭐️ <b>Preuve Sociale (Avis)</b> : Affichage public des notes de vos clients sous vos produits pour rassurer les nouveaux acheteurs.\n\n` +
        `💎 <b>Tarif d'installation : 85€ net par fonctionnalité.</b>\n\n` +
        `👉 <i>Intéressé ? Rendez-vous dans votre menu "Espace Client & Hotline" pour demander l'installation immédiate !</i>`;

    console.log(`Sending broadcast to ${users.length} users...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
        try {
            await bot.telegram.sendMessage(user.id, message, { parse_mode: 'HTML' });
            successCount++;
            // Small delay to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
            failCount++;
            console.error(`Failed to send to ${user.id}:`, err.message);
        }
    }

    console.log(`Broadcast complete. Success: ${successCount}, Failed: ${failCount}`);
    process.exit(0);
}

broadcast();
