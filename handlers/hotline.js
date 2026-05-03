const { Markup } = require('telegraf');
const { safeEdit, cleanupUserChat } = require('../services/utils');

const pendingTicketInfo = new Map();

function setupHotlineHandlers(bot) {

    // Hotline main menu
    bot.action('hotline_menu', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const text = `🎧 <b>Bienvenue dans la hotline pour vos bots</b>\n\nVeuillez sélectionner votre problème ci-dessous :`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('Mon bot Telegram ne fonctionne plus', 'hotline_issue_tg_down')],
            [Markup.button.callback('Mon bot WhatsApp ne fonctionne plus', 'hotline_issue_wa_down')],
            [Markup.button.callback('Mes bots TG et WA ne fonctionnent plus', 'hotline_issue_both_down')],
            [Markup.button.callback('J\'ai un projet / Nouvelle fonctionnalité', 'hotline_issue_feature')],
            [Markup.button.callback('Mon problème n\'est pas listé', 'hotline_issue_other')],
            [Markup.button.callback('◀️ Retour', 'start_welcome')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    // Handle issue selection
    bot.action(/^hotline_issue_(.+)$/, async (ctx) => {
        const issueKey = ctx.match[1];
        await ctx.answerCbQuery().catch(() => {});

        const issueMap = {
            'tg_down': 'Mon bot Telegram ne fonctionne plus',
            'wa_down': 'Mon bot WhatsApp ne fonctionne plus',
            'both_down': 'Mes bots TG et WA ne fonctionnent plus',
            'feature': 'J\'ai un projet / Nouvelle fonctionnalité',
            'other': 'Mon problème n\'est pas listé'
        };

        const reason = issueMap[issueKey] || 'Problème inconnu';
        pendingTicketInfo.set(ctx.from.id, { reason, type: 'hotline' });

        const text = `🎧 Vous avez sélectionné : <b>${reason}</b>\n\n⚠️ <b>Obligatoire :</b> Afin que notre équipe puisse vous recontacter en message privé, veuillez envoyer votre <b>@username Telegram</b> ci-dessous :`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Annuler', 'hotline_menu')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    // Sales menu start (after J'aimerais en savoir plus)
    bot.action('sales_menu_start', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const bannerUrl = 'https://le-plug-idf.up.railway.app/public/bot_presentation_premium_banner.png'; // Assuming it will be served or just use the local path if possible
        
        const text = `🚀 <b>BOOSTEZ VOTRE BUSINESS AVEC NOS BOTS</b>\n\n` +
            `Transformez votre canal Telegram ou WhatsApp en une véritable <b>machine à vendre automatisée</b>. Notre solution est la plus complète du marché.\n\n` +
            `✅ <b>Pourquoi nous choisir ?</b>\n` +
            `• 🤖 <b>Automatisation 100%</b> : Encaissez, gérez et livrez sans lever le petit doigt.\n` +
            `• 📱 <b>Multi-Plateforme</b> : Présent sur Telegram et WhatsApp simultanément.\n` +
            `• 🛡 <b>Sécurité Maximale</b> : Protection contre le spam, base de données sécurisée.\n` +
            `• ⚡️ <b>Vitesse & Fluidité</b> : Une interface ultra-rapide pour vos clients.\n\n` +
            `💬 <i>Déjà plus de 50 boutiques nous font confiance !</i>`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💎 Voir nos Tarifs & Formules', 'show_pricing')],
            [Markup.button.callback('🚀 Voir les Fonctionnalités', 'show_features')],
            [Markup.button.callback('🔍 Tester le catalogue démo', 'main_menu')],
            [Markup.button.callback('◀️ Retour', 'start_welcome')]
        ]);
        
        // Since we can't guarantee the URL immediately, we use the photo option which safeEdit handles
        // If we have a local path from the generate_image tool, we could use it, but for now we'll stick to text-only if photo fails
        return safeEdit(ctx, text, { 
            parse_mode: 'HTML', 
            photo: 'https://i.ibb.co/vzYpYq6/bot-banner.png' || null, // Fallback to a placeholder or empty if needed
            ...keyboard 
        });
    });

    // Features Showcase
    bot.action('show_features', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const text = `🚀 <b>FONCTIONNALITÉS INCLUSES</b>\n\n` +
            `Nos bots sont conçus pour offrir la meilleure expérience utilisateur possible :\n\n` +
            `🛒 <b>Catalogue Dynamique</b> : Gestion illimitée de produits avec photos et vidéos.\n` +
            `💳 <b>Paiements Multiples</b> : Lydia, Crypto, Cash, Apple Pay, CB.\n` +
            `🎁 <b>Fidélisation</b> : Système de parrainage et codes promos intégrés.\n` +
            `🚴 <b>Système Livreur</b> : Console dédiée pour vos livreurs avec géolocalisation.\n` +
            `📊 <b>Dashboard Admin</b> : Statistiques de ventes en temps réel et gestion totale.\n` +
            `🎧 <b>Support Hotline</b> : Système de tickets intégré pour aider vos clients.\n` +
            `📱 <b>Sync Cloud</b> : Vos données sont sauvegardées et synchronisées partout.\n\n` +
            `🔥 <i>Et bien plus encore pour dominer votre marché !</i>`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💎 Voir les Tarifs', 'show_pricing')],
            [Markup.button.callback('◀️ Retour', 'sales_menu_start')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    // Pricing menu
    bot.action('show_pricing', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const text = `💎 <b>CHOISISSEZ VOTRE FORMULE</b>\n\n` +
            `Investissez dans l'outil qui va faire passer votre business au niveau supérieur :\n\n` +
            `🥉 <b>PACK BRONZE - 350€</b>\n` +
            `• Bot Telegram Complet\n` +
            `• Support technique 1 an\n` +
            `• Hébergement inclus\n\n` +
            `🟧 <b>PACK WHATSAPP - 450€</b>\n` +
            `• Bot WhatsApp Professionnel\n` +
            `• Gestion stable des sessions\n` +
            `• Support technique 1 an\n\n` +
            `🥈 <b>PACK STANDARD - 550€</b>\n` +
            `• <b>Telegram + WhatsApp Sync</b>\n` +
            `• Système Livreur Premium\n` +
            `• Dashboard Admin Avancé\n\n` +
            `🥇 <b>PACK PREMIUM - 650€</b>\n` +
            `• <b>L'offre ULTIME : Tout inclus</b>\n` +
            `• Installation prioritaire\n` +
            `• Personnalisation complète du design\n` +
            `• Accès aux futures mises à jour\n\n` +
            `👇 <i>Sélectionnez votre formule pour démarrer :</i>`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🥉 Bronze (TG)', 'select_plan_bronze'), Markup.button.callback('🟧 WhatsApp', 'select_plan_wa')],
            [Markup.button.callback('🥈 Standard (TG+WA)', 'select_plan_standard')],
            [Markup.button.callback('🥇 PREMIUM (Recommandé)', 'select_plan_premium')],
            [Markup.button.callback('◀️ Retour', 'sales_menu_start')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    // Handle plan selection
    bot.action(/^select_plan_(.+)$/, async (ctx) => {
        const planKey = ctx.match[1];
        await ctx.answerCbQuery().catch(() => {});

        const planMap = {
            'bronze': '🥉 Bronze 350€ (TG)',
            'wa': '🟧 WhatsApp 450€',
            'standard': '🥈 Standard 550€ (TG+WA)',
            'premium': '🥇 Premium 650€'
        };

        const planName = planMap[planKey] || 'Plan inconnu';
        pendingTicketInfo.set(ctx.from.id, { reason: `Intéressé par : ${planName}`, type: 'sales' });

        const text = `💎 Vous avez choisi : <b>${planName}</b>\n\n⚠️ <b>Obligatoire :</b> Afin que notre équipe puisse finaliser votre commande et vous contacter, veuillez envoyer votre <b>@username Telegram</b> ci-dessous :`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Annuler', 'show_pricing')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    // Handle text input for username
    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id;
        if (pendingTicketInfo.has(userId)) {
            const ticketData = pendingTicketInfo.get(userId);
            const usernameInput = ctx.message.text.trim();
            pendingTicketInfo.delete(userId);

            const finalReason = `${ticketData.reason}\n\n👤 <b>Contact fourni par l'utilisateur :</b> ${usernameInput}`;

            // Save to bot_support_logs
            const { supabase } = require('../services/database');
            const payload = {
                user_id: String(userId),
                staff_id: null,
                message: JSON.stringify({ reason: finalReason, status: 'open', price: null }),
                type: 'ticket',
                direction: 'in',
                created_at: new Date().toISOString()
            };
            await supabase.from('bot_support_logs').insert([payload]);

            if (ticketData.type === 'hotline') {
                const text = `✅ <b>Ticket envoyé avec succès !</b>\n\nVotre demande a bien été transmise à notre équipe technique. Un administrateur va vous répondre très prochainement sur votre compte Telegram : <b>${usernameInput}</b>.`;
                return ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Retour à l\'accueil', 'start_welcome')]]) });
            } else {
                const text = `🎉 <b>Excellent choix !</b>\n\nUn ticket a été ouvert. Notre équipe vous contactera très vite sur votre compte Telegram <b>${usernameInput}</b> pour finaliser votre commande !`;
                return ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Retour à l\'accueil', 'start_welcome')]]) });
            }
        }
        return next();
    });
}

module.exports = { setupHotlineHandlers };
