const { supabase, decryptOrder } = require('./database');
const { sendMessageToUser } = require('./notifications');

// --- Dynamic Text Generator (Anti-Fatigue & Personalized) ---

const MESSAGES = {
    fr: {
        INTROS: [
            "Psst {first_name}... 👀",
            "Hello {first_name} ! 🌿",
            "Hey {first_name}, devinez quoi ? 🔥",
            "Salut {first_name} ! Prêt pour une petite douceur ? 😋",
            "Juste pour vous, {first_name}... 🤫",
            "On pensait justement à vous, {first_name} ! ✨"
        ],
        BODY_NEW_CLIENT: [
            "Vous avez jeté un œil à <b>{product}</b> récemment... Et franchement, vous avez bon goût ! 👌",
            "On a vu que <b>{product}</b> vous faisait de l'œil. C'est le moment de craquer !",
            "Si vous cherchez la crème de la crème, ne cherchez pas plus loin que <b>{product}</b>."
        ],
        BODY_RETENTION: [
            "On sait que vous adorez <b>{product}</b>. Bonne nouvelle : il est en stock et n'attend que vous ! 🛒",
            "C'est bientôt l'heure de votre session habituelle... <b>{product}</b> est prêt à partir en livraison express ! 💨",
            "Votre variété favorite, <b>{product}</b>, vient tout juste d'être réapprovisionnée. Premier arrivé, premier servi ! 🏆"
        ],
        BODY_AGGRESSIVE: [
            "Ça fait un petit moment qu'on ne vous a pas vu ! Votre <b>{product}</b> préféré vous attend, on vous prépare ça ? 🎁",
            "Ne ratez pas notre stock de <b>{product}</b>, les autres clients se l'arrachent en ce moment ! ⏳"
        ],
        OUTROS: [
            "

👇 Ouvrez la Mini App en un clic :",
            "

👇 Faites-vous plaisir maintenant :",
            "

👇 Commandez discrètement ici :"
        ],
        BTN: "🛍️ Ouvrir la Mini App"
    },
    en: {
        INTROS: [
            "Psst {first_name}... 👀",
            "Hello {first_name}! 🌿",
            "Hey {first_name}, guess what? 🔥",
            "Hi {first_name}! Ready for a little treat? 😋",
            "Just for you, {first_name}... 🤫",
            "We were just thinking about you, {first_name}! ✨"
        ],
        BODY_NEW_CLIENT: [
            "You took a look at <b>{product}</b> recently... And honestly, you have great taste! 👌",
            "We saw <b>{product}</b> caught your eye. Now's the time to go for it!",
            "If you're looking for the best of the best, look no further than <b>{product}</b>."
        ],
        BODY_RETENTION: [
            "We know you love <b>{product}</b>. Good news: it's in stock and waiting for you! 🛒",
            "It's almost time for your usual session... <b>{product}</b> is ready for express delivery! 💨",
            "Your favorite strain, <b>{product}</b>, has just been restocked. First come, first served! 🏆"
        ],
        BODY_AGGRESSIVE: [
            "It's been a while since we saw you! Your favorite <b>{product}</b> is waiting, shall we prepare it for you? 🎁",
            "Don't miss out on our stock of <b>{product}</b>, other customers are grabbing it right now! ⏳"
        ],
        OUTROS: [
            "

👇 Open the Mini App in one click:",
            "

👇 Treat yourself now:",
            "

👇 Order discreetly here:"
        ],
        BTN: "🛍️ Open the Mini App"
    },
    es: {
        INTROS: [
            "Psst {first_name}... 👀",
            "¡Hola {first_name}! 🌿",
            "Hey {first_name}, ¿adivina qué? 🔥",
            "¡Hola {first_name}! ¿Listo para un capricho? 😋",
            "Solo para ti, {first_name}... 🤫",
            "¡Justo estábamos pensando en ti, {first_name}! ✨"
        ],
        BODY_NEW_CLIENT: [
            "Has echado un vistazo a <b>{product}</b> recientemente... ¡Y la verdad, tienes muy buen gusto! 👌",
            "Vimos que <b>{product}</b> te llamó la atención. ¡Es el momento de darse el capricho!",
            "Si buscas lo mejor de lo mejor, no busques más allá de <b>{product}</b>."
        ],
        BODY_RETENTION: [
            "Sabemos que te encanta <b>{product}</b>. Buenas noticias: ¡está en stock y te espera! 🛒",
            "Ya casi es hora de tu sesión habitual... ¡<b>{product}</b> está listo para entrega express! 💨",
            "Tu variedad favorita, <b>{product}</b>, acaba de ser reabastecida. ¡El primero en llegar se lo lleva! 🏆"
        ],
        BODY_AGGRESSIVE: [
            "¡Hace tiempo que no te vemos! Tu <b>{product}</b> favorito te espera, ¿te lo preparamos? 🎁",
            "¡No te pierdas nuestro stock de <b>{product}</b>, otros clientes se lo están llevando ahora mismo! ⏳"
        ],
        OUTROS: [
            "

👇 Abre la Mini App en un clic:",
            "

👇 Date un capricho ahora:",
            "

👇 Pide discretamente aquí:"
        ],
        BTN: "🛍️ Abrir la Mini App"
    },
    de: {
        INTROS: [
            "Psst {first_name}... 👀",
            "Hallo {first_name}! 🌿",
            "Hey {first_name}, rate mal! 🔥",
            "Hi {first_name}! Bereit für eine kleine Freude? 😋",
            "Nur für dich, {first_name}... 🤫",
            "Wir haben gerade an dich gedacht, {first_name}! ✨"
        ],
        BODY_NEW_CLIENT: [
            "Du hast dir kürzlich <b>{product}</b> angesehen... Und ehrlich gesagt, du hast einen guten Geschmack! 👌",
            "Wir haben gesehen, dass <b>{product}</b> dir aufgefallen ist. Jetzt ist die Zeit, zuzugreifen!",
            "Wenn du nach dem Besten vom Besten suchst, such nicht weiter als <b>{product}</b>."
        ],
        BODY_RETENTION: [
            "Wir wissen, dass du <b>{product}</b> liebst. Gute Nachrichten: Es ist auf Lager und wartet auf dich! 🛒",
            "Es ist fast Zeit für deine übliche Session... <b>{product}</b> ist bereit für die Expresslieferung! 💨",
            "Deine Lieblingssorte, <b>{product}</b>, wurde gerade wieder aufgefüllt. Wer zuerst kommt, mahlt zuerst! 🏆"
        ],
        BODY_AGGRESSIVE: [
            "Es ist schon eine Weile her, seit wir dich gesehen haben! Dein Lieblings-<b>{product}</b> wartet, sollen wir es für dich vorbereiten? 🎁",
            "Verpasse nicht unseren Bestand an <b>{product}</b>, andere Kunden greifen gerade zu! ⏳"
        ],
        OUTROS: [
            "

👇 Öffne die Mini-App mit einem Klick:",
            "

👇 Gönn dir jetzt etwas:",
            "

👇 Bestelle hier diskret:"
        ],
        BTN: "🛍️ Mini-App öffnen"
    }
};

function generateDynamicText(firstName, productName, type, lang = 'fr') {
    if (!MESSAGES[lang]) lang = 'fr';
    const m = MESSAGES[lang];
    const randomInt = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const intro = randomInt(m.INTROS).replace('{first_name}', firstName || 'l\'ami');
    
    let bodyArr = m.BODY_NEW_CLIENT;
    if (type === 'retention') bodyArr = m.BODY_RETENTION;
    else if (type === 'retention_aggressive') bodyArr = m.BODY_AGGRESSIVE;
    
    const body = randomInt(bodyArr).replace('{product}', productName);
    const outro = randomInt(m.OUTROS);
    return `${intro}

${body}${outro}`;
}

function getBtnText(lang = 'fr') {
    if (!MESSAGES[lang]) lang = 'fr';
    return MESSAGES[lang].BTN;
}


// --- The "Graph" & Feature Engineering ---

function computeFavoriteHour(orders) {
    if (!orders || orders.length === 0) return 18;
    const hourCounts = {};
    orders.forEach(o => {
        const h = new Date(o.created_at).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    // Find mode (most frequent hour)
    let bestHour = 18;
    let maxCount = -1;
    for (const h in hourCounts) {
        if (hourCounts[h] > maxCount) {
            maxCount = hourCounts[h];
            bestHour = parseInt(h);
        }
    }
    return bestHour;
}

function computeOrderFrequencyMs(orders) {
    if (!orders || orders.length < 2) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    const sorted = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let totalDiff = 0;
    for (let i = 1; i < sorted.length; i++) {
        totalDiff += (new Date(sorted[i].created_at) - new Date(sorted[i - 1].created_at));
    }
    return totalDiff / (sorted.length - 1);
}

// Heavy Ranker: Scores products based on history and views
function rankProducts(orders, views) {
    const scores = {};

    // In-Network (Achats passés) - Weight: +10 par commande
    if (orders) {
        orders.forEach(o => {
            try {
                let itemsList = typeof o.cart === 'string' ? JSON.parse(o.cart) : o.cart;
                if (!itemsList && o.items) itemsList = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                
                if (Array.isArray(itemsList)) {
                    itemsList.forEach(it => {
                        const name = it.productName || it.name;
                        if (name) scores[name] = (scores[name] || 0) + 10;
                    });
                } else if (o.product_name) {
                    const parts = o.product_name.split(',');
                    parts.forEach(p => {
                        const cleanName = p.split(' (x')[0].split('\n')[0].trim();
                        if (cleanName) scores[cleanName] = (scores[cleanName] || 0) + 10;
                    });
                }
            } catch(e) {}
        });
    }

    // Intention (Vues récentes) - Weight: +3 par vue
    if (views) {
        views.forEach(v => {
            if (v.productName) {
                // Récence: Vues des dernières 24h = +5, plus ancien = +3
                const age = Date.now() - v.viewed_at;
                const weight = age < 24 * 60 * 60 * 1000 ? 5 : 3;
                scores[v.productName] = (scores[v.productName] || 0) + weight;
            }
        });
    }

    const sorted = Object.keys(scores).map(k => ({ product: k, score: scores[k] })).sort((a, b) => b.score - a.score);
    return sorted;
}

// --- Candidate Generation & Delivery ---

async function runRecommendationEngine() {
    console.log('[RECOMMENDATION] Démarrage du Heavy Ranker Twitter-Style...');
    try {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        
        // 1. Fetch Orders (Up to 60 days to better calculate frequency)
        const { data: rawOrders } = await supabase
            .from('bot_orders')
            .select('*')
            .gte('created_at', sixtyDaysAgo.toISOString());
        const orders = (rawOrders || []).map(decryptOrder);

        // 2. Fetch Views
        const { data: viewsState } = await supabase.from('bot_state').select('user_key, value').eq('namespace', 'user_views');
        const allViews = {};
        if (viewsState) {
            viewsState.forEach(row => {
                allViews[row.user_key] = row.value || [];
            });
        }

        // 3. Fetch Tracking State (Anti-Fatigue)
        const { data: fatigueState } = await supabase.from('bot_state').select('user_key, value').eq('namespace', 'fatigue_tracker');
        const fatigueTracker = {};
        if (fatigueState) {
            fatigueState.forEach(row => {
                fatigueTracker[row.user_key] = row.value;
            });
        }

        const now = Date.now();
        const currentHour = new Date().getHours();

        // Group orders by user_id
        const userOrders = {};
        if (orders) {
            orders.forEach(o => {
                if (!userOrders[o.user_id]) userOrders[o.user_id] = [];
                userOrders[o.user_id].push(o);
            });
        }

        let settings = {};
        try {
            const { data: settingsRow } = await supabase.from('bot_settings').select('*').limit(1).single();
            settings = settingsRow || {};
        } catch(e) {}
        
        
        const allUserIds = new Set([...Object.keys(userOrders), ...Object.keys(allViews)]);
        
        // --- FETCH USER LANGUAGES ---
        const { data: usersData } = await supabase.from('bot_users').select('id, language_code, data');
        const userLangs = {};
        if (usersData) {
            usersData.forEach(u => {
                let lang = u.language_code || (u.data && u.data.language) || 'fr';
                const rawId = String(u.id).split('_').pop();
                userLangs[rawId] = lang;
                userLangs[u.id] = lang;
            });
        }

        let notificationsSent = 0;

        for (const userId of allUserIds) {
            const uOrders = userOrders[userId] || [];
            const uViews = allViews[userId] || [];
            
            // Cooldown Filter: Don't spam! Minimum 24h between notifications (max 1 par jour par utilisateur)
            const lastSent = fatigueTracker[userId];
            if (lastSent && (now - lastSent) < 24 * 60 * 60 * 1000) {
                continue; // Skip, too recent
            }

            let candidateType = null;

            if (uOrders.length === 0) {
                // NOUVEAU CLIENT: S'il a des vues, on le relance après 2h, idéalement vers 18h ou 19h
                if (uViews.length > 0) {
                    const lastView = uViews[uViews.length - 1];
                    if (now - lastView.viewed_at > 2 * 60 * 60 * 1000) { // Wait at least 2h after view
                        if (currentHour >= 17 && currentHour <= 20) {
                            candidateType = 'acquisition';
                        }
                    }
                }
            } else {
                // CLIENT EXISTANT
                const favHour = computeFavoriteHour(uOrders);
                const freqMs = computeOrderFrequencyMs(uOrders);
                const lastOrderTime = Math.max(...uOrders.map(o => new Date(o.created_at).getTime()));
                const timeSinceLastOrder = now - lastOrderTime;
                
                // Predictive Timing: 1 hour before their usual ordering time
                let targetNotifHour = favHour - 1;
                if (targetNotifHour < 0) targetNotifHour = 23;
                
                // Frequency Matching
                if (timeSinceLastOrder >= (freqMs * 0.85)) {
                    // They are approaching their usual order day
                    if (currentHour === targetNotifHour || currentHour === favHour) {
                        candidateType = 'retention';
                    }
                }
                
                // Progressive Nudge: They missed their usual window significantly (e.g. 1.5x frequency)
                if (!candidateType && timeSinceLastOrder >= (freqMs * 1.5)) {
                    if (currentHour >= 18 && currentHour <= 20) { // Safe evening window
                        candidateType = 'retention_aggressive';
                    }
                }
            }

            // Delivery Phase
            if (candidateType) {
                const rankedProducts = rankProducts(uOrders, uViews);
                if (rankedProducts.length > 0) {
                    const topProduct = rankedProducts[0].product;
                    let firstName = "l'ami";
                    if (uOrders.length > 0) {
                        // Sort orders to ensure we look at the newest first
                        const sortedOrders = [...uOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        // Find the first valid name that isn't a raw encrypted string (which contains colons and is very long)
                        const validOrder = sortedOrders.find(o => o.first_name && (!o.first_name.includes(':') || o.first_name.length < 100));
                        if (validOrder) firstName = validOrder.first_name;
                    }
                    
                    
                    const rawTgId = String(userId).split('_').pop();
                    const userLang = userLangs[rawTgId] || userLangs[userId] || 'fr';
                    const message = generateDynamicText(firstName, topProduct, candidateType, userLang);

                    const btnText = getBtnText(userLang);
                    const keyboard = {
                        inline_keyboard: [[{ text: btnText, web_app: { url: (process.env.RENDER_EXTERNAL_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/catalog` : 'https://monshopbot-production.up.railway.app/catalog')) } }]]
                    };

                    const tgId = userId.replace('telegram_', '');
                    
                    console.log(`[RECOMMENDATION] Sending ${candidateType} notif to ${tgId} for product ${topProduct}`);
                    
                    await sendMessageToUser(tgId, message, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
                    
                    fatigueTracker[userId] = now;
                    notificationsSent++;
                }
            }
        }

        // Sauvegarder la fatigue
        if (notificationsSent > 0) {
            if (settingsRow && settingsRow.key === 'fatigue_tracker') {
                await supabase.from('bot_settings').update({ data: fatigueTracker }).eq('key', 'fatigue_tracker');
            } else {
                // If it doesn't exist, we should ideally check if any row exists or just upsert.
                // In shoptonbot, bot_settings usually uses upsert or check.
                await supabase.from('bot_settings').upsert({ key: 'fatigue_tracker', data: fatigueTracker }, { onConflict: 'key' });
            }
        }
        
    } catch (e) {
        console.error('[RECOMMENDATION] Erreur:', e.message);
    }
}

module.exports = { runRecommendationEngine, generateDynamicText, rankProducts };
