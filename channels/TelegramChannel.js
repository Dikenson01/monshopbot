const { Telegraf, Markup } = require('telegraf');
const { Channel } = require('./Channel');
const path = require('path');

class TelegramChannel extends Channel {
    constructor(token) {
        super('telegram', 'Telegram');
        // Nettoyage agressif du token (trim et suppression des caractères parasites comme \n, \r ou =)
        let cleanToken = (token || '').trim();
        if (cleanToken.startsWith('=')) {
            cleanToken = cleanToken.substring(1).trim();
        }
        this.token = cleanToken;
        this.bot = null;
        this.messageHandler = null;
    }

    onMessage(handler) {
        this.messageHandler = handler;
    }

    _resolveMedia(url) {
        if (typeof url === 'string' && url.startsWith('/public/')) {
            return { source: path.join(__dirname, '..', 'web', url) };
        }
        return url;
    }

    async initialize() {
        this.bot = new Telegraf(this.token);

        this.bot.use(async (ctx, next) => {
            const start = Date.now();
            await next();
            const ms = Date.now() - start;
            if (ctx.from) {
                console.log(
                    `[TG] @${ctx.from.username || ctx.from.id} — ${ctx.updateType} (${ms}ms)`
                );
            }
        });

        this.bot.catch((err, ctx) => {
            console.error('[TG] Erreur Global:', err.message);
        });

        // Relayer tout vers le dispatcher
        this.bot.on('update', (update) => {
            if (update.message || update.callback_query) {
                console.log(`[TG-RAW] Update reçu ID=${update.update_id} de ${update.message?.from?.id || update.callback_query?.from?.id}`);
            }
        });

        this.bot.on('message', async (ctx) => {
            console.log(`[TG-DEBUG] Message reçu de ${ctx.from.id}: "${ctx.message.text ||'NO_TEXT'}"`);
            if (this.messageHandler) {
                await this.messageHandler({
                    from: ctx.from.id,
                    name: ctx.from.first_name,
                    text: ctx.message.text || ctx.message.caption,
                    photo: ctx.message.photo,
                    video: ctx.message.video,
                    message_id: ctx.message.message_id,
                    type: 'message',
                    ctx: ctx // On garde le ctx original pour compatibilité ascendante si besoin
                });
            }
        });

        this.bot.on('callback_query', async (ctx) => {
            console.log(`[TG-CB] Callback reçu: "${ctx.callbackQuery.data}" de ${ctx.from.id}`);
            if (this.messageHandler) {
                await this.messageHandler({
                    from: ctx.from.id,
                    name: ctx.from.first_name,
                    text: ctx.callbackQuery.data,
                    type: 'callback_query',
                    isAction: true,
                    ctx: ctx
                });
            } else {
                console.error('[TG-CB] ERREUR: Pas de messageHandler !');
            }
        });

        this.bot.on('chat_join_request', async (ctx) => {
            console.log(`[TG-JOIN] Demande de join de ${ctx.from.id} pour le chat ${ctx.chat.id}`);
            if (this.messageHandler) {
                await this.messageHandler({
                    from: ctx.from.id,
                    name: ctx.from.first_name,
                    text: 'chat_join_request',
                    type: 'chat_join_request',
                    ctx: ctx
                });
            }
        });
    }

    async start() {
        // --- DISTRIBUTED LOCK ---
        const { claimLock, checkLock } = require('../services/database');
        const instanceId = `${process.env.RAILWAY_SERVICE_NAME || 'local'}-${process.env.RAILWAY_REPLICA_INDEX || '0'}-${process.pid}`;
        const telegramLockId = `tg_lock`;

        const lock = await checkLock(telegramLockId);
        if (lock && lock.owner !== instanceId) {
            console.log(`[TG-LOCK] Telegram session busy (Owner: ${lock.owner}). Waiting 30s...`);
            setTimeout(() => this.start(), 30000);
            return;
        }

        const claimed = await claimLock(telegramLockId, instanceId);
        if (!claimed) {
            console.log(`[TG-LOCK] Failed to claim lock. Retrying in 30s...`);
            setTimeout(() => this.start(), 30000);
            return;
        }

        // Heartbeat lock refresh
        setInterval(async () => {
            await claimLock(telegramLockId, instanceId);
        }, 60000);

        console.log(`[TG-LOCK] Telegram lock claimed by ${instanceId}`);
        console.log(`[TG] Préparation du lancement (${this.token.substring(0, 6)}****)...`);
        
        const launch = async (retryCount = 0) => {
            try {
                console.log(`[TG] [Essai ${retryCount + 1}] Reset de la connexion...`);
                
                // 1. Suppression du webhook avec drop_pending_updates
                await this.bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(e => console.warn(`[TG] deleteWebhook error: ${e.message}`));
                
                // 2. Test getMe via Telegraf pour valider la liaison Telegraf <-> API
                const me = await this.bot.telegram.getMe();
                console.log(`[TG] Telegraf validé pour @${me.username}`);

                // 3. Lancement avec polling explicite et timeout court
                console.log(`[TG] Lancement du polling (launch)...`);
                this.bot.launch({
                    dropPendingUpdates: true,
                    allowedUpdates: ['message', 'callback_query', 'edited_message', 'channel_post', 'chat_join_request'],
                    polling: {
                        timeout: 30,
                        limit: 100
                    }
                }).then(() => {
                    console.log('✅ [TG] BOT TELEGRAM EN LIGNE (Polling actif)');
                    this.isActive = true;
                }).catch(err => {
                    console.error('❌ [TG] Erreur fatale polling:', err.message);
                    if (err.message.includes('409')) {
                        console.warn(`⚠️ [TG] Conflit 409 détecté. Nouvelle tentative dans 10s...`);
                        setTimeout(() => launch(retryCount + 1), 10000);
                    }
                });

                console.log(`[TG] Séquence de lancement terminée, écoute en cours...`);
            } catch (err) {
                console.error('❌ [TG] Erreur critique initialisation:', err.message);
                setTimeout(() => launch(retryCount + 1), 20000);
            }
        };

        launch();
        console.log('  Telegram channel initialization requested...');
    }

    async stop() {
        if (this.bot) this.bot.stop('SIGTERM');
        this.isActive = false;
    }

    async sendMessage(chatId, text, options = {}) {
        console.log(`[TG] Tentative d'envoi à ${chatId}...`);
        try {
            // Si options contient media_url, on redirige
            if (options.media_url) {
                if (options.media_type === 'multiple') {
                    try {
                        const mediaArray = JSON.parse(options.media_url);
                        return this.sendMediaGroup(chatId, mediaArray, text, options);
                    } catch (e) {
                        console.error("JSON Parse multiple failed:", e);
                    }
                } else if (options.media_type === 'video') {
                    return this.sendVideo(chatId, options.media_url, text, options);
                } else {
                    return this.sendPhoto(chatId, options.media_url, text, options);
                }
            }

            // Vérifier si le texte contient du HTML intentionnel
            const hasHtmlTags = text && text.match(/<[a-z/][\s\S]*>/i);

            let finalMsg = text || '';
            if (!hasHtmlTags) {
                finalMsg = finalMsg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }

            const extra = { parse_mode: 'HTML' };
            if (options.reply_markup) extra.reply_markup = options.reply_markup;
            else if (options.inline_keyboard || options.keyboard) extra.reply_markup = options;
            if (options.protect_content) extra.protect_content = true;

            const result = await this.bot.telegram.sendMessage(chatId, finalMsg, extra);
            return { success: true, messageId: result?.message_id, message_id: result?.message_id };
        } catch (error) {
            console.error(`[TG] Erreur d'envoi à ${chatId}:`, error.message);
            return this._handleError(error);
        }
    }

    async sendPhoto(chatId, url, caption, options = {}) {
        try {
            const extra = { parse_mode: 'HTML', caption: caption || '' };
            if (options.reply_markup) extra.reply_markup = options.reply_markup;
            else if (options.inline_keyboard || options.keyboard) extra.reply_markup = options;
            if (options.protect_content) extra.protect_content = true;

            const result = await this.bot.telegram.sendPhoto(chatId, this._resolveMedia(url), extra);
            return { success: true, messageId: result?.message_id, message_id: result?.message_id };
        } catch (error) {
            console.error(`[TG] Erreur photo à ${chatId}:`, error.message);
            return this._handleError(error);
        }
    }

    async sendVideo(chatId, url, caption, options = {}) {
        try {
            const extra = { parse_mode: 'HTML', caption: caption || '' };
            if (options.reply_markup) extra.reply_markup = options.reply_markup;
            else if (options.inline_keyboard || options.keyboard) extra.reply_markup = options;
            if (options.protect_content) extra.protect_content = true;

            const result = await this.bot.telegram.sendVideo(chatId, this._resolveMedia(url), extra);
            return { success: true, messageId: result?.message_id, message_id: result?.message_id };
        } catch (error) {
            console.error(`[TG] Erreur vidéo à ${chatId}:`, error.message);
            return this._handleError(error);
        }
    }

    async sendMediaGroup(chatId, mediaArray, caption, options = {}) {
        try {
            const telegramMedia = mediaArray.map((m, index) => {
                const item = {
                    type: m.type,
                    media: this._resolveMedia(m.url),
                };
                if (index === 0) { // On met la légende seulement sur le premier élément
                    item.caption = caption;
                    item.parse_mode = 'HTML';
                }
                return item;
            });
            const results = await this.bot.telegram.sendMediaGroup(chatId, telegramMedia);
            const firstId = Array.isArray(results) ? results[0]?.message_id : results?.message_id;
            return { success: true, messageId: firstId, message_id: firstId };
        } catch (error) {
            console.error(`[TG] Erreur MediaGroup à ${chatId}:`, error.message);
            return this._handleError(error);
        }
    }

    async sendInteractive(userId, text, buttons = [], options = {}) {
        // En Telegram, interactiveButtons = Inline Keyboard
        const keyboard = buttons.map((b) => {
            // Sécurité: si c'est un lien URL
            if (b.url) return [Markup.button.url(b.title, b.url)];
            // Si c'est un webApp
            if (b.web_app) return [Markup.button.webApp(b.title, b.web_app)];
            // Sinon c'est un callback
            return [Markup.button.callback(b.title, b.id)];
        });

        const sendOpts = {
            reply_markup: { inline_keyboard: keyboard },
            protect_content: options.protect_content || false
        };

        // Si un média est fourni dans les options, on l'envoie avec le clavier
        if (options.media_url) {
            let mediaType = options.media_type || null;
            // Fallback: détection par extension si media_type manquant
            if (!mediaType) {
                const videoExts = /\.(mp4|mov|avi|mkv|webm|m4v)(\?.*)?$/i;
                mediaType = videoExts.test(options.media_url) ? 'video' : 'photo';
            }
            if (mediaType === 'video') {
                return this.sendVideo(userId, options.media_url, text, sendOpts);
            } else {
                return this.sendPhoto(userId, options.media_url, text, sendOpts);
            }
        }

        return this.sendMessage(userId, text, sendOpts);
    }

    _handleError(error) {
        const code = error.response?.error_code;
        const desc = error.response?.description || error.message;
        const BLOCKED_SIGNALS = ['bot was blocked', 'user is deactivated', 'chat not found'];

        const result = { success: false, error: desc };

        if (code === 403 || BLOCKED_SIGNALS.some((s) => desc.includes(s))) {
            result.blocked = true;
        } else if (code === 429) {
            result.rateLimited = true;
            result.retryAfter = error.response?.parameters?.retry_after || 5;
        }
        return result;
    }

    getCapabilities() {
        return {
            hasSessionWindow: false,
            supportsHTML: true,
            supportsInlineKeyboard: true,
            supportsInteractiveButtons: true,
        };
    }

    getBotInstance() { return this.bot; }
}

module.exports = { TelegramChannel };
