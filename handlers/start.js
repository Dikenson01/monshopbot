const { Markup } = require('telegraf');
const { registerUser, getUser, incrementDailyStat, getAppSettings, addMessageToTrack, getLastMenuId, getSupplierByTelegramId } = require('../services/database');
const { t } = require('../services/i18n');
const { safeEdit, cleanupUserChat, clearActiveMediaGroup } = require('../services/utils');
const { createPersistentMap } = require('../services/persistent_map');
const { isAdmin } = require('./admin');
const { notifyAdmins } = require('../services/notifications');
const { clearAllAwaitingMaps } = require('./supplier_marketplace');

const pendingReferralInput = createPersistentMap('pendingReferral');

async function initStartState() {
    await pendingReferralInput.load();
}

/**
 * Génère un message d'accueil dynamique et professionnel
 */
function getDynamicWelcomeMessage(ctx, user) {
    const name = user.first_name || 'Partenaire';
    const hour = new Date().getHours();
    
    let greeting = "Bonjour";
    if (hour >= 18 || hour < 5) greeting = "Bonsoir";

    const variations = [
        `🚀 <b>${greeting} ${name}, prêt à révolutionner votre business ?</b>\n\nBienvenue chez <b>SHOPTONBOT</b>, l'excellence de l'automatisation à votre service.`,
        `✨ <b>${greeting} ${name}, l'efficacité n'attend pas.</b>\n\nBienvenue chez <b>SHOPTONBOT</b>. Nous transformons vos processus complexes en flux automatisés et rentables.`,
        `💎 <b>${greeting} ${name}, entrez dans l'ère de la performance.</b>\n\nBienvenue chez <b>SHOPTONBOT</b>. Découvrez nos solutions d'automatisation Telegram & WhatsApp conçues pour durer.`,
        `⚙️ <b>${greeting} ${name}, automatisez, encaissez, répétez.</b>\n\nBienvenue chez <b>SHOPTONBOT</b>. Votre partenaire stratégique pour une croissance sans friction.`
    ];

    // On choisit une variation basée sur l'ID utilisateur pour que ce soit "stable" mais différent entre clients
    const index = parseInt(String(user.id).slice(-1)) % variations.length;
    return variations[index];
}

/**
 * Vérifie si l'utilisateur est abonné au canal requis
 */
async function checkSubscription(bot, ctx, settings) {
    if (ctx.platform !== 'telegram') return true;
    if (!settings.force_subscribe || !settings.force_subscribe_channel_id) return true;

    try {
        const member = await ctx.telegram.getChatMember(settings.force_subscribe_channel_id, ctx.from.id);
        const status = member.status;
        return ['creator', 'administrator', 'member'].includes(status);
    } catch (e) {
        console.error('[FORCE_SUB] Erreur checkSubscription:', e.message);
        return false; // Par défaut, on bloque si erreur (ex: bot pas admin du canal)
    }
}

/**
 * Enregistre les handlers pour la commande /start
 */
function setupStartHandler(bot) {

    bot.command('language', async (ctx) => {
        const text = `🌐 <b>CHOIX DE LA LANGUE / LANGUAGE CHOICE</b>\n\nChoisissez votre langue de préférence :\nChoose your preferred language:`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🇫🇷 Français', 'set_lang_fr')],
            [Markup.button.callback('🇺🇸 English', 'set_lang_en')],
            [Markup.button.callback('◀️ Menu', 'main_menu')]
        ]);
        return ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action(/^set_lang_(.+)$/, async (ctx) => {
        const lang = ctx.match[1];
        const { supabase, COL_USERS, clearUserCache } = require('../services/database');
        const docId = `${ctx.platform}_${ctx.from.id}`;
        
        // 1. Patch state immediately so the menu renders in the new language now
        if (!ctx.state.user) ctx.state.user = {};
        if (!ctx.state.user.data) ctx.state.user.data = {};
        ctx.state.user.data.language = lang;
        ctx.state.user.language_code = lang;

        // 2. Persist to DB (awaited so cache is cleared after write, not before)
        await supabase.from(COL_USERS).update({ 
            language_code: lang, 
            data: { ...(ctx.state.user.data), language: lang } 
        }).eq('id', docId);
        
        // 3. Bust cache AFTER the write completes
        clearUserCache(docId);

        const msg = lang === 'fr' ? '✅ Langue réglée sur Français !' : '✅ Language set to English!';
        await ctx.answerCbQuery(msg);
        return showMainMenu(ctx);
    });

    bot.command('start', async (ctx) => {
        try {
            const user = ctx.from;
            const docId = `${ctx.platform}_${user.id}`;
            const settings = ctx.state?.settings || await getAppSettings();

            // Nettoyage agressif : Supprimer la commande /start de l'utilisateur + tous les anciens messages bot
            try { 
                await ctx.deleteMessage().catch(() => {});
                clearActiveMediaGroup(docId); 
                await cleanupUserChat(ctx); 
            } catch(e) {}

            // Vérifier si un code de parrainage
            let referrerId = null;
            const payload = (ctx.message && ctx.message.text) ? ctx.message.text.split(' ')[1] : null;
            if (payload && payload.startsWith('ref_')) {
                referrerId = payload;
                if (payload.includes(`_${user.id}_`)) referrerId = null;
            }

            const { isNew, user: registeredUser } = await registerUser(user, ctx.platform, referrerId);
            ctx.state.user = registeredUser;
            await incrementDailyStat('start_commands');

            // --- NOUVEAU : FORCE SUBSCRIBE ---
            if (ctx.platform === 'telegram' && settings.force_subscribe) {
                const isSubscribed = await checkSubscription(bot, ctx, settings);
                if (!isSubscribed) {
                    const subText = `⚠️ <b>ABONNEMENT REQUIS</b>\n\n` +
                        `Bonjour <b>${user.first_name}</b>,\n\n` +
                        `Pour continuer et accéder à nos services, vous devez d'abord rejoindre notre canal officiel.\n\n` +
                        `C'est ici que nous publions nos nouveautés et promotions ! 🚀`;
                    
                    const subKeyboard = Markup.inlineKeyboard([
                        [Markup.button.url('📢 Rejoindre le Canal', settings.channel_url || 'https://t.me/channel')],
                        [Markup.button.callback(settings.btn_verify_sub || '✅ Vérifier / Nouveau Lien', 'check_sub')]
                    ]);

                    return await safeEdit(ctx, subText, {
                        photo: settings.welcome_photo || null,
                        ...subKeyboard
                    });
                    // --- NOUVEAU : SYSTÈME D'APPROBATION ---
                    // On ne fait plus d'auto-approbation ici pour forcer la validation manuelle admin.
                }
            }

            // --- NOUVEAU : SYSTÈME D'APPROBATION (STRICT) ---
            const isApproved = registeredUser.is_approved !== false || registeredUser.is_livreur === true || (await isAdmin(ctx));

            if (!isApproved) {
                // NOUVEAU: Prévenir les doublons (Debounce)
                const lastRequestAt = registeredUser.data?.request_sent_at;
                const fiveMinAgo = Date.now() - (5 * 60 * 1000);
                if (!lastRequestAt || lastRequestAt < Date.now() - (10 * 60 * 1000)) {
                    // Marquer comme envoyé IMMÉDIATEMENT (avant notifyAdmins)
                    const { supabase, COL_USERS } = require('../services/database');
                    registeredUser.data = registeredUser.data || {};
                    registeredUser.data.request_sent_at = Date.now();
                    supabase.from(COL_USERS).update({ data: registeredUser.data }).eq('id', docId).then(() => {}, () => {});

                    // Alerte Admin avec bouton d'approbation
                    const adminMsg = `🆕 <b>DEMANDE D'ACCÈS</b>\n\n` +
                        `👤 Client : ${user.first_name}\n` +
                        `🆔 ID : <code>${user.id}</code> (Platform: ${ctx.platform})\n` +
                        `Username : @${user.username || 'Inconnu'}\n\n` +
                        `<i>Cliquez sur le bouton ci-dessous pour lui donner accès au catalogue.</i>`;
                    
                    const adminKeyboard = Markup.inlineKeyboard([
                        [Markup.button.callback('✅ DONNER ACCÈS', `approve_${ctx.platform}_${user.id}`)]
                    ]);

                    await notifyAdmins(bot, adminMsg, adminKeyboard).catch(() => {});
                }
                
                const isWa = ctx.platform === 'whatsapp';
                const restrictedText = `🛑 <b>ACCÈS RESTREINT</b>\n\n` +
                    `Bonjour <b>${user.first_name}</b>,\n\n` +
                    `Pour accéder au bot, vous devez d'abord envoyer un message à l'administrateur.\n` +
                    `Une fois que l'admin aura validé votre accès, vous pourrez commander.\n\n` +
                    (isWa ? `📝 <i>Une fois validé, écrivez <b>/start</b> pour actualiser le menu.</i>\n\n` +
                            `👇 <b>Cliquez sur les liens ci-dessous :</b>\n` +
                            (settings.private_contact_wa_url ? `• *WhatsApp Admin :* ${settings.private_contact_wa_url}\n` : '') +
                            (settings.private_contact_url ? `• *Telegram Admin :* ${settings.private_contact_url}\n` : '') +
                            (settings.channel_url ? `• *Notre Canal :* ${settings.channel_url}\n` : '') : 
                            `👇 <b>Veuillez cliquer ci-dessous :</b>`);
                
                const b = [];
                if (settings.private_contact_url) b.push([Markup.button.url('✉️ Telegram : Admin', settings.private_contact_url)]);
                if (settings.private_contact_wa_url) b.push([Markup.button.url('✉️ WhatsApp : Admin', settings.private_contact_wa_url)]);
                b.push([Markup.button.url('📢 S’abonner au canal', settings.channel_url || 'https://t.me/channel')]);
                b.push([Markup.button.callback('🔄 Rafraîchir mon statut', 'start')]);
                
                const restrictedKeyboard = Markup.inlineKeyboard(b);

                return await safeEdit(ctx, restrictedText, {
                    photo: settings.welcome_photo || null,
                    ...restrictedKeyboard
                });
            }

            let welcomeText = '';

            // Notification Admin pour les nouveaux (déjà approuvés par chance ou anciens)
            if (isNew) {
                const newMsg = `👤 <b>NOUVEL UTILISATEUR !</b>\n\n` +
                    `Nom : ${user.first_name}\n` +
                    `Username : @${user.username || 'Inconnu'}\n` +
                    `ID : <code>${user.id}</code>\n` +
                    (referrerId ? `🎁 Parrainé par : <code>${referrerId}</code>` : `🔍 Arrivé en direct`);
                notifyAdmins(bot, newMsg).catch(() => {});
            }

            // --- BIFURCATION HOTLINE (EXISTING VS NEW) ---
            const [isAdminUser, supplier] = await Promise.all([
                isAdmin(ctx),
                getSupplierByTelegramId(String(ctx.from.id))
            ]);
            
            if (isAdminUser) {
                // Les admins voient le menu normal immédiatement
                const welcomeBackText = (settings.msg_welcome_back || `👋 <b>Ravi de vous revoir, {first_name} !</b>`)
                    .replace('{first_name}', user.first_name);
                
                const keyboard = await getWelcomeKeyboard(ctx, settings, registeredUser);
                await safeEdit(ctx, welcomeBackText, {
                    photo: settings.welcome_photo || null,
                    ...keyboard
                });
            } else {
                // Bifurcation pour les clients
                const dynamicText = getDynamicWelcomeMessage(ctx, user);
                const text = `${dynamicText}\n\nQue souhaitez-vous faire pour propulser votre activité ?`;
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('📂 Mon Projet & Abonnements', 'view_my_project')],
                    [Markup.button.callback('🏗 Créer mon propre Bot', 'config_start')],
                    [Markup.button.callback('💎 Découvrir nos Offres', 'show_pricing')],
                    [Markup.button.callback('🆘 Support & Hotline', 'hotline_menu')]
                ]);
                await safeEdit(ctx, text, { parse_mode: 'HTML', ...keyboard });
            }

            if (ctx.telegram) {
                console.log(`[TG-DEBUG] Setting commands for ${ctx.from.id}`);
                ctx.telegram.setMyCommands([
                    { command: 'start', description: '🏠 Lancer le bot / Accueil' },
                    { command: 'menu', description: '🛒 Voir le catalogue' },
                    { command: 'orders', description: '📦 Mes commandes' },
                    { command: 'admin', description: '🔐 Console Admin' },
                    { command: 'help', description: '❓ Aide et support' }
                ]).catch(e => console.error('[TG-DEBUG] setMyCommands error:', e.message));
                
                ctx.telegram.setChatMenuButton(ctx.chat.id, { type: 'commands' }).catch(() => { });
            }

        } catch (error) {
            console.error('❌ Erreur fatale /start:', error.message, error.stack);
        }
    });

    bot.action('check_sub', async (ctx) => {
        await ctx.answerCbQuery();
        const settings = ctx.state?.settings || await getAppSettings();
        if (ctx.platform === 'telegram' && settings.force_subscribe) {
            const isSubscribed = await checkSubscription(bot, ctx, settings);
            if (!isSubscribed) {
                return ctx.reply('❌ Vous n\'êtes pas encore abonné au canal. Veuillez cliquer sur "Rejoindre le Canal" puis réessayer.', { parse_mode: 'HTML' });
            } else {
                ctx.reply('✅ Abonnement vérifié avec succès !', { parse_mode: 'HTML' });
                // Simulate a /start command to re-evaluate the user logic
                return bot.handleUpdate({ ...ctx.update, message: { text: '/start', from: ctx.from } });
            }
        }
        return bot.handleUpdate({ ...ctx.update, message: { text: '/start', from: ctx.from } });
    });

    bot.action('main_menu', async (ctx) => {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        return showMainMenu(ctx);
    });

    bot.action('start_welcome', async (ctx) => {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        const settings = ctx.state?.settings || await getAppSettings();
        const user = ctx.state?.user;
        const welcomeText = `🛰 <b>BIENVENUE SUR NOTRE PLATEFORME</b>\n\n` +
            `Découvrez le bot de vente le plus avancé du marché.\n` +
            `Que vous soyez un client fidèle ou un futur partenaire, nous avons la solution qu'il vous faut.\n\n` +
            `👇 <b>Faites votre choix :</b>`;
        const keyboard = await getWelcomeKeyboard(ctx, settings, user);
        return safeEdit(ctx, welcomeText, {
            photo: settings.welcome_photo || null,
            ...keyboard
        });
    });

    bot.action('user_settings', async (ctx) => {
        await ctx.answerCbQuery();
        const settings = ctx.state?.settings || await getAppSettings();
        const text = `⚙️ <b>RÉGLAGES</b>\n\nQue souhaitez-vous modifier ?`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🌐 Langue / Language', 'set_language_menu')],
            [Markup.button.callback('◀️ Retour Menu', 'main_menu')]
        ]);
        return safeEdit(ctx, text, keyboard);
    });

    bot.action('set_language_menu', async (ctx) => {
        await ctx.answerCbQuery();
        const text = `🌐 <b>CHOIX DE LA LANGUE / LANGUAGE CHOICE</b>\n\nChoisissez votre langue préférée :`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🇫🇷 Français', 'set_lang_fr')],
            [Markup.button.callback('🇺🇸 English', 'set_lang_en')],
            [Markup.button.callback('◀️ Retour aux réglages', 'user_settings')]
        ]);
        return safeEdit(ctx, text, keyboard);
    });

    bot.action('my_referrals', async (ctx) => {
        await ctx.answerCbQuery();
        const settings = ctx.state?.settings || await getAppSettings();
        const user = ctx.state?.user;
        if (!user) return ctx.reply('⚠️ Utilisateur introuvable.');

        const text = `🎁 <b>PARRAINAGE</b>\n\n` +
            `Invitez vos amis et gagnez des récompenses !\n\n` +
            `🔗 <b>Votre lien :</b>\n` +
            `<code>https://t.me/${ctx.botInfo?.username || 'bot'}?start=${user.referral_code}</code>\n\n` +
            `📊 <b>Stats :</b>\n` +
            `• Amis parrainés : ${user.referral_count || 0}\n` +
            `• Crédit gagné : ${user.wallet || 0}€`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('◀️ Retour Menu', 'main_menu')]
        ]);
        return safeEdit(ctx, text, keyboard);
    });

    bot.action('client_mode_force', async (ctx) => {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        const settings = await getAppSettings();
        const user = await getUser(`${ctx.platform}_${ctx.from.id}`);
        const supplier = await getSupplierByTelegramId(String(ctx.from.id));
        const isFournisseur = !!supplier;
        
        const text = t(user, 'msg_client_mode', `🛒 <b>Mode Client</b>\n\nVous pouvez maintenant commander comme un client normal.`);
        const keyboard = await getMainMenuKeyboard(ctx, settings, user, isFournisseur);
        
        await safeEdit(ctx, text, {
            photo: settings.welcome_photo || null,
            ...keyboard
        });
    });

    bot.action('private_contact', async (ctx) => {
        await ctx.answerCbQuery();
        const settings = ctx.state?.settings || await getAppSettings();
        const supplier = await getSupplierByTelegramId(String(ctx.from.id));
        const isFournisseur = !!supplier;
        
        const buttons = [];
        if (settings.private_contact_url) {
            buttons.push([Markup.button.url('📲 Telegram : Admin', settings.private_contact_url)]);
        }
        if (settings.private_contact_wa_url) {
            buttons.push([Markup.button.url('📲 WhatsApp : Admin', settings.private_contact_wa_url)]);
        }
        buttons.push([Markup.button.callback('◀️ Retour', 'main_menu')]);
        
        let text = `${settings.ui_icon_contact || '💬'} <b>${settings.label_contact || 'Contact Admin'}</b>\n\n` +
                   `Bonjour <b>${ctx.from.first_name}</b>, vous pouvez nous contacter en direct :\n\n` +
                   (settings.private_contact_url ? `🔹 <b>Telegram :</b> <a href="${settings.private_contact_url}">Cliquez ici</a>\n` : '') +
                   (settings.private_contact_wa_url ? `🔸 <b>WhatsApp :</b> <a href="${settings.private_contact_wa_url}">Cliquez ici</a>\n\n` : '\n') +
                   (isFournisseur ? `<i>Note : En tant que fournisseur, utilisez ces liens pour toute question logistique ou paiement.</i>\n\n` : '') +
                   `Cliquez sur l'un des boutons ci-dessous pour ouvrir une discussion.`;
        await safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action('channel_link', async (ctx) => {
        await ctx.answerCbQuery();
        const settings = ctx.state?.settings || await getAppSettings();
        const buttons = [
            [Markup.button.url('📢 Rejoindre le canal', settings.channel_url || 'https://t.me/channel'), Markup.button.callback('◀️ Retour', 'main_menu')]
        ];
        let text = `${settings.ui_icon_channel} <b>${settings.label_channel || 'Lien Canal'}</b>\n\n` +
                   (settings.channel_url ? `📢 Lien direct : <a href="${settings.channel_url}">${settings.channel_url}</a>\n\n` : '') +
                   `Restez informé de nos nouveautés en rejoignant notre canal officiel.`;
        await safeEdit(ctx, text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.on('location', async (ctx) => {
        const userId = `${ctx.platform}_${ctx.from.id}`;
        const loc = ctx.message.location;
        if (!loc) return;
        try {
            const { saveUserLocation } = require('../services/database');
            await saveUserLocation(userId, loc.latitude, loc.longitude);
            await ctx.reply('✅ Position enregistrée.');
        } catch (e) { console.error('Location error:', e); }
    });

    bot.on('text', async (ctx, next) => {
        const docId = `${ctx.platform}_${ctx.from.id}`;
        const inputText = ctx.message.text.trim();
        if (!pendingReferralInput.has(docId)) return next();
        pendingReferralInput.delete(docId);
        if (inputText.startsWith('ref_') || (inputText.startsWith('/start ') && inputText.includes('ref_'))) {
            const ref = inputText.startsWith('/start ') ? inputText.split(' ')[1] : inputText;
            try {
                const { registerUser } = require('../services/database');
                await registerUser(ctx.from, ctx.platform, ref);
                return ctx.reply('🎉 Code parrainage validé !');
            } catch (e) { }
        }
        return next();
    });

    bot.action('check_sub', async (ctx) => {
        const settings = await getAppSettings();
        const isSubscribed = await checkSubscription(bot, ctx, settings);
        
        if (!isSubscribed) {
            return await ctx.answerCbQuery('❌ Vous n\'êtes pas encore abonné au canal !', { show_alert: true });
        }
        
        await ctx.answerCbQuery('✅ Merci pour votre abonnement !');
        // Relancer le start
        return bot.handleUpdate({ ...ctx.update, message: { text: '/start', from: ctx.from } });
    });
}
/**
 * Affiche le menu principal (Standard ou Livreur)
 */
async function showMainMenu(ctx) {
    const userId = `${ctx.platform}_${ctx.from.id}`;
    // Nettoyer les états marketplace
    clearAllAwaitingMaps(ctx.from.id);
    const settings = await getAppSettings();
    // Use already-patched ctx.state.user if available (e.g. right after language change),
    // otherwise fetch fresh from DB.
    const freshUser = await getUser(userId);
    // Merge: prefer freshUser data but keep in-memory language if it was just changed
    let user = freshUser;
    if (user && ctx.state.user?.language_code && ctx.state.user.language_code !== user.language_code) {
        // In-memory language is newer (race condition guard)
        user = { ...user, language_code: ctx.state.user.language_code, data: { ...(user.data || {}), language: ctx.state.user.language_code } };
    }
    if (user) ctx.state.user = user; // Ensure ctx.state.user is up-to-date for t()
    
    // Anti-blocage unapproved en retour menu
    const isApproved = (user && user.is_approved !== false) || (await isAdmin(ctx));
    if (!isApproved) {
        return ctx.reply(t(user, 'msg_access_denied', '🛑 Accès restreint.'));
    }

    const { isAdmin } = require('./admin');
    const isAdminUser = await isAdmin(ctx);

    if (user && user.is_livreur && !isAdminUser) {
        const { getLivreurOrders } = require('../services/database');
        const activeOrders = await getLivreurOrders(user.id);
        const hasActive = activeOrders.length > 0;
        const city = user?.current_city || user?.data?.current_city || 'Non défini';
        const isAvail = user?.is_available || user?.data?.is_available;

        const statusLabel = isAvail ? t(user, 'label_available', 'DISPONIBLE') : t(user, 'label_unavailable', 'INDISPONIBLE');
        const livreurText = t(user, 'msg_livreur_welcome', `🚴 <b>Bienvenue, {first_name} !</b>`, { first_name: user.first_name }) + '\n\n' +
            t(user, 'msg_livreur_city', `📍 Secteur : <b>{city}</b>`, { city: city.toUpperCase() }) + '\n' +
            t(user, 'msg_livreur_status', `🔘 Statut : <b>{status}</b>`, { 
                status: (isAvail ? (settings.ui_icon_success || '✅') : (settings.ui_icon_error || '❌')) + ' ' + statusLabel
            }) + '\n\n';

        const keyboard = await getLivreurMenuKeyboard(ctx, settings, user, hasActive, isAdminUser);
        return await safeEdit(ctx, livreurText, { photo: settings.welcome_photo || null, ...keyboard });
    }

    const text = t(freshUser, 'menu_main', `⚡️ <b>CONSOLE DE COMMANDE</b>\n\nExplorez notre catalogue et testez la fluidité de notre système.\n\n👇 <i>Utilisez les boutons ci-dessous pour naviguer :</i>`);
    const supplier = await getSupplierByTelegramId(String(ctx.from.id));
    const isFournisseur = !!supplier;
    const keyboard = await getMainMenuKeyboard(ctx, settings, freshUser, isFournisseur, isAdminUser);

    await safeEdit(ctx, text, {
        photo: settings.welcome_photo || null,
        ...keyboard
    });
}

async function getMainMenuKeyboard(ctx, settings, user, isFournisseur = false, isAdminUser = false) {
    if (!settings) settings = ctx.state?.settings || await getAppSettings();
    const buttons = [];

    // Ligne 0 : Pricing (Nouveau bouton ultra-visible)
    buttons.push([Markup.button.callback(`💎 JE VEUX CE BOT POUR MON BUSINESS 💎`, 'show_pricing')]);

    // Ligne 1 : Commander (Gros bouton principal)
    buttons.push([Markup.button.callback(`${settings.ui_icon_catalog || '👟'} ${t(user, 'btn_catalog', settings.label_catalog || 'Passer une commande')}`, 'view_catalog')]);
    
    // Suivi commande (Uniquement si panier plein)
    const { userCarts } = require('./order_system');
    const cart = userCarts.get(`${ctx.platform}_${ctx.from.id}`) || [];
    if (cart.length > 0) {
        buttons.push([Markup.button.callback(`🛒 ${t(user, 'btn_cart').toUpperCase()} (${cart.length})`, 'view_cart')]);
    }

    // Ligne 2 : Panier & Mes Commandes
    buttons.push([
        Markup.button.callback(`${settings.ui_icon_cart || '🛒'} ${t(user, 'btn_cart', 'Panier')}`, 'view_cart'),
        Markup.button.callback(`${settings.ui_icon_orders || '📦'} ${t(user, 'btn_orders', 'Commandes')}`, 'my_orders')
    ]);

    // Ligne 3 : Aide & Contact
    const row3 = [];
    if (settings.enable_help_menu !== false) {
        row3.push(Markup.button.callback(`${settings.ui_icon_support || '❓'} ${t(user, 'btn_support', 'Aide')}`, 'help_menu'));
    }
    row3.push(Markup.button.callback(`${settings.ui_icon_contact || '📱'} ${t(user, 'btn_contact', 'Contact')}`, 'private_contact'));
    if (row3.length > 0) buttons.push(row3);

    // Ligne 4 : Parrainage & Canal
    const row4 = [];
    if (settings.enable_referral !== false) {
        row4.push(Markup.button.callback(`${settings.ui_icon_profile || '🎁'} ${t(user, 'btn_referral', 'Parrain')}`, 'my_referrals'));
    }
    row4.push(Markup.button.callback(`${settings.ui_icon_channel || '📢'} ${t(user, 'btn_channel', 'Canal')}`, 'channel_link'));
    if (row4.length > 0) buttons.push(row4);

    // Ligne 5 : Espace Livreur / Fournisseur
    const spaces = [];
    if (user?.is_livreur) spaces.push(Markup.button.callback(`${settings.ui_icon_livreur || '🚴'} Livreur`, 'livreur_menu'));
    if (settings.enable_marketplace !== false) {
        if (user?.is_supplier || user?.is_mp_admin || isFournisseur) {
            spaces.push(Markup.button.callback('🏪 Fourn.', 'supplier_menu'));
        }
    }
    if (spaces.length > 0) buttons.push(spaces);

    // Ligne de fin : Paramètres & Admin
    const footers = [Markup.button.callback(`${settings.btn_settings || '⚙️'} ${t(user, 'btn_settings', 'Réglages')}`, 'user_settings')];
    if (user?.is_admin || isAdminUser) {
        footers.push(Markup.button.callback(`${settings.ui_icon_admin || '🛠'} ${t(user, 'btn_admin', 'Admin')}`, 'admin_menu'));
    }
    if (footers.length > 0) buttons.push(footers);

    return Markup.inlineKeyboard(buttons);
}

async function getLivreurMenuKeyboard(ctx, settings, user, hasActiveOrders = false, isAdminUser = false) {
    const isAvail = user?.is_available || user?.data?.is_available;
    const buttons = [
        [Markup.button.callback(isAvail ? '🔴 ' + t(user, 'btn_avail_off', 'Indisponible') : '🟢 ' + t(user, 'btn_avail_on', 'Disponible'), isAvail ? 'set_dispo_false' : 'set_dispo_true')],
        [
            Markup.button.callback(`${settings.ui_icon_orders || '📦'} ${t(user, 'btn_orders_available_label', 'Commandes')}`, 'show_available_orders'), 
            Markup.button.callback(`🗓 ${t(user, 'btn_planned_orders_label', 'Planifiées')}`, 'show_planned_orders')
        ],
        [
            Markup.button.callback(`${settings.ui_icon_stats || '📈'} ${t(user, 'btn_history_orders_label', 'Historique')}`, 'my_deliveries'), 
            Markup.button.callback(settings.btn_client_mode || `🛍 ${t(user, 'btn_client_mode_label', 'Client')}`, 'client_mode_force')
        ],
        [Markup.button.callback(`${settings.btn_settings || '⚙️'} ${t(user, 'btn_livreur_settings', 'Réglages')}`, 'user_settings')]
    ];
    if (hasActiveOrders) buttons.unshift([Markup.button.callback(t(user, 'btn_active_deliveries_label', '🚚 MES LIVRAISONS EN COURS 🔥'), 'active_deliveries')]);
    if (user?.is_admin || isAdminUser) buttons.push([Markup.button.callback(`🛠 ${t(user, 'btn_admin', 'Admin Panel')}`, 'admin_menu')]);
    
    return Markup.inlineKeyboard(buttons);
}

async function getWelcomeKeyboard(ctx, settings, user) {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🚀 CRÉER MON PROPRE BOT', 'sales_menu_start')],
        [Markup.button.callback('🛒 TESTER LE CATALOGUE (DÉMO)', 'main_menu')],
        [Markup.button.callback('🎧 SUPPORT / HOTLINE CLIENT', 'hotline_menu')]
    ]);
}

module.exports = { setupStartHandler, initStartState, getLivreurMenuKeyboard, getMainMenuKeyboard, getWelcomeKeyboard, showMainMenu };
