const { Markup } = require('telegraf');
const { safeEdit, cleanupUserChat } = require('../services/utils');

const pendingTicketInfo = new Map();

function setupHotlineHandlers(bot) {

    // Hotline main menu
        const text = `🎧 <b>ESPACE CLIENT & HOTLINE</b>\n\nBienvenue dans votre espace dédié. Que souhaitez-vous faire ?`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📂 Mon Projet & Abonnements', 'view_my_project')],
            [Markup.button.callback('🆘 Signaler un problème (Ticket)', 'hotline_issues_list')],
            [Markup.button.callback('◀️ Retour', 'start_welcome')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('hotline_issues_list', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const text = `🎧 <b>SUPPORT TECHNIQUE</b>\n\nSélectionnez le type de problème rencontré :`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('Mon bot Telegram ne fonctionne plus', 'hotline_issue_tg_down')],
            [Markup.button.callback('Mon bot WhatsApp ne fonctionne plus', 'hotline_issue_wa_down')],
            [Markup.button.callback('Mes bots TG et WA ne fonctionnent plus', 'hotline_issue_both_down')],
            [Markup.button.callback('J\'ai un projet / Nouvelle fonctionnalité', 'hotline_issue_feature')],
            [Markup.button.callback('Mon problème n\'est pas listé', 'hotline_issue_other')],
            [Markup.button.callback('◀️ Retour', 'hotline_menu')]
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
        pendingTicketInfo.set(ctx.from.id, { reason, type: 'hotline', priority: 'normal' });

        const text = `🎧 Vous avez sélectionné : <b>${reason}</b>\n\n` +
            `🔴 <b>Niveau d'urgence :</b>\n` +
            `Si votre problème bloque totalement vos ventes, choisissez <b>URGENT</b>.`;
            
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('⚡️ URGENT (Blocage total)', `hotline_priority_urgent`)],
            [Markup.button.callback('🟢 Normal (Demande standard)', `hotline_priority_normal`)],
            [Markup.button.callback('◀️ Annuler', 'hotline_menu')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    // Handle priority selection
    bot.action(/^hotline_priority_(.+)$/, async (ctx) => {
        const priority = ctx.match[1];
        await ctx.answerCbQuery().catch(() => {});
        
        const info = pendingTicketInfo.get(ctx.from.id);
        if (info) info.priority = priority;

        const text = `🎧 Demande : <b>${info?.reason}</b>\n` +
            `Urgence : <b>${priority === 'urgent' ? '⚡️ URGENT' : '🟢 Normal'}</b>\n\n` +
            `⚠️ <b>Obligatoire :</b> Veuillez envoyer votre <b>@username Telegram</b> ci-dessous pour que l'assistance puisse vous contacter :`;
            
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Retour', 'hotline_menu')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    // Sales menu start (after J'aimerais en savoir plus)
    bot.action('sales_menu_start', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        
        const text = `🚀 <b>VOTRE BUSINESS MÉRITE LE MEILLEUR</b>\n\n` +
            `Ne vous contentez pas d'un simple bot. Offrez à votre boutique une <b>infrastructure de vente complète</b>.\n\n` +
            `🏆 <b>Pourquoi sommes-nous numéro 1 ?</b>\n` +
            `• ⚡️ <b>Vitesse Record</b> : Traitement des commandes en moins de 3 secondes.\n` +
            `• 💳 <b>Paiements Illimités</b> : Crypto, Lydia, Apple Pay, PayPal, CB.\n` +
            `• 📦 <b>Logistique Intégrée</b> : Console livreur et suivi en temps réel.\n` +
            `• 🔒 <b>Sécurité Bancaire</b> : Données cryptées et protection anti-spam.\n\n` +
            `🥇 <i>Plus rentable, plus rapide, plus sûr. Éteignez la concurrence dès aujourd'hui.</i>`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💎 Découvrir nos Offres', 'show_pricing')],
            [Markup.button.callback('📊 Comparer avec la concurrence', 'show_comparison')],
            [Markup.button.callback('🚀 Liste des Fonctionnalités', 'show_features')],
            [Markup.button.callback('🔍 Tester la Démo Live', 'main_menu')],
            [Markup.button.callback('◀️ Retour', 'start_welcome')]
        ]);
        
        return safeEdit(ctx, text, { 
            parse_mode: 'HTML', 
            photo: 'https://le-plug-idf.up.railway.app/public/bot_ventes_premium_fr.png' || null,
            ...keyboard 
        });
    });

    // Comparison View
    bot.action('show_comparison', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const text = `📊 <b>NOTRE SOLUTION vs LA CONCURRENCE</b>\n\n` +
            `❌ <b>Bots Classiques :</b>\n` +
            `• Lent et instable\n` +
            `• Un seul mode de paiement\n` +
            `• Pas de gestion livreur\n` +
            `• Design basique et peu rassurant\n\n` +
            `✅ <b>Notre Solution Premium :</b>\n` +
            `• <b>Fluidité absolue</b> (Hébergement Pro)\n` +
            `• <b>Multitude de paiements</b> (Crypto & CB)\n` +
            `• <b>Console Livreur</b> ultra-performante\n` +
            `• <b>Design UX/UI</b> qui donne envie d'acheter\n` +
            `• <b>Support VIP</b> réactif 24/7\n\n` +
            `👉 <i>Le choix de la rentabilité est évident.</i>`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💎 Choisir ma formule', 'show_pricing')],
            [Markup.button.callback('◀️ Retour', 'sales_menu_start')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
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
                message: JSON.stringify({ 
                    reason: finalReason, 
                    status: 'open', 
                    price: null, 
                    priority: ticketData.priority || 'normal',
                    category: ticketData.type 
                }),
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
    // --- ESPACE PROJET & ABONNEMENTS ---
    bot.action('view_my_project', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const { supabase } = require('../services/database');
        const userId = String(ctx.from.id);
        
        // Récupérer le projet du client
        const { data: project } = await supabase.from('bot_client_projects').select('*').eq('id', `telegram_${userId}`).single();
        
        if (!project) {
            const text = `📂 <b>MON PROJET</b>\n\n` +
                `Vous n'avez pas encore de projet enregistré sur ce compte ou votre projet est en cours de déploiement.\n\n` +
                `👉 <i>Si vous êtes déjà client, contactez l'admin pour lier votre projet à cet ID Telegram.</i>`;
            const keyboard = Markup.inlineKeyboard([[Markup.button.callback('◀️ Retour', 'hotline_menu')]]);
            return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
        }

        const features = project.features || [];
        const plan = project.subscription_plan || 'none';
        const expires = project.subscription_expires_at ? new Date(project.subscription_expires_at).toLocaleDateString('fr-FR') : 'N/A';

        const planNames = {
            'none': '❌ Aucun (Paiement à l\'acte)',
            'maintenance': '🛠 Maintenance & Sécurité',
            'evolution': '🚀 Évolution & Croissance'
        };

        const text = `📂 <b>VOTRE PROJET : ${project.bot_name || 'Bot Client'}</b>\n\n` +
            `🤖 Type : <b>${project.bot_type?.toUpperCase() || 'TG'}</b>\n` +
            `💎 Abonnement : <b>${planNames[plan]}</b>\n` +
            `📅 Prochaine échéance : <code>${expires}</code>\n\n` +
            `✅ <b>Fonctionnalités actives :</b>\n` +
            (features.length > 0 ? features.map(f => `• ${f}`).join('\n') : '<i>Aucune option activée</i>') + '\n\n' +
            `🛠 <b>Actions :</b>`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🚀 Voir les Abonnements', 'view_sub_plans')],
            [Markup.button.callback('✨ Recommandations pour vous', 'view_recommendations')],
            [Markup.button.callback('◀️ Retour', 'hotline_menu')]
        ]);

        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('view_sub_plans', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const text = `💎 <b>NOS FORMULES D'ABONNEMENT</b>\n\n` +
            `Optimisez vos coûts et garantissez la stabilité de votre business :\n\n` +
            `🛠 <b>Pack Maintenance - 50€/mois</b>\n` +
            `• Remise en ligne prioritaire si le bot saute\n` +
            `• Mises à jour de sécurité constantes\n` +
            `• Backup quotidien de votre base de données\n\n` +
            `🚀 <b>Pack Évolution - 100€/mois</b>\n` +
            `• <b>2 Nouvelles fonctionnalités / mois incluses</b> (valeur 200€)\n` +
            `• Support VIP 24h/24\n` +
            `• Maintenance & Sécurité incluse\n\n` +
            `💸 <i>Sans abonnement : 100€ / fonctionnalité supplémentaire.</i>`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('S\'abonner au Pack Maintenance', 'sub_request_maintenance')],
            [Markup.button.callback('S\'abonner au Pack Évolution', 'sub_request_evolution')],
            [Markup.button.callback('◀️ Retour', 'view_my_project')]
        ]);
        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('view_recommendations', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const { supabase } = require('../services/database');
        const userId = String(ctx.from.id);
        
        const [projectData, catalogData] = await Promise.all([
            supabase.from('bot_client_projects').select('features').eq('id', `telegram_${userId}`).single(),
            supabase.from('bot_features_catalog').select('*')
        ]);

        const myFeatures = projectData.data?.features || [];
        const allFeatures = catalogData.data || [];
        
        // Trouver ce que le client n'a pas
        const recommendations = allFeatures.filter(f => !myFeatures.includes(f.id));

        let text = `✨ <b>RECOMMANDATIONS POUR VOUTE BOT</b>\n\n` +
            `Voici les fonctionnalités que vous ne possédez pas encore et qui pourraient booster vos ventes :\n\n`;

        if (recommendations.length === 0) {
            text += `✅ <b>Félicitations !</b> Vous possédez déjà toutes les options disponibles. Votre bot est au maximum de ses capacités.`;
        } else {
            recommendations.slice(0, 3).forEach(f => {
                text += `<b>• ${f.name}</b> (${f.price}€)\n<i>${f.description}</i>\n\n`;
            });
            text += `👇 <i>Contactez l'admin pour ajouter l'une de ces options !</i>`;
        }

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💬 Demander une installation', 'hotline_issue_feature')],
            [Markup.button.callback('◀️ Retour', 'view_my_project')]
        ]);

        return safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action(/^sub_request_(.+)$/, async (ctx) => {
        const plan = ctx.match[1];
        await ctx.answerCbQuery('Demande envoyée !');
        
        const { notifyAdmins } = require('../services/notifications');
        const adminMsg = `💳 <b>NOUVELLE DEMANDE D'ABONNEMENT</b>\n\n` +
            `👤 Client : ${ctx.from.first_name} (@${ctx.from.username})\n` +
            `🆔 ID : <code>${ctx.from.id}</code>\n` +
            `💎 Formule : <b>${plan.toUpperCase()}</b>`;
        
        await notifyAdmins(ctx.bot || bot, adminMsg);
        
        return ctx.reply(`✅ <b>Votre demande a été transmise !</b>\n\nL'administrateur va vous contacter pour activer votre abonnement <b>${plan}</b>.`);
    });
}

module.exports = { setupHotlineHandlers };
