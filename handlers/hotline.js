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
        const { showMainMenu } = require('./start');
        return showMainMenu(ctx);
    });

    // Pricing menu
    bot.action('show_pricing', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const text = `💎 <b>Nos Formules & Tarifs</b>\n\nVoici nos offres. Les prix sont non négociables.\nSélectionnez la formule qui vous intéresse :`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🥉 Bronze 350€ (TG)', 'select_plan_bronze')],
            [Markup.button.callback('🟧 WhatsApp 450€', 'select_plan_wa')],
            [Markup.button.callback('🥈 Standard 550€ (TG+WA)', 'select_plan_standard')],
            [Markup.button.callback('🥇 Premium 650€', 'select_plan_premium')],
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
