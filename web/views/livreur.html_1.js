
        const originalFetch = window.fetch;
        window.fetch = function() {
            let resource = arguments[0];
            let config = arguments[1] || {};
            if (typeof resource === 'string' && resource.startsWith('/')) {
                if (!config.headers) config.headers = {};
                if (!(config.headers instanceof Headers)) {
                    config.headers['ngrok-skip-browser-warning'] = '69420';
                } else {
                    config.headers.append('ngrok-skip-browser-warning', '69420');
                }
            }
            return originalFetch.call(window, resource, config);
        };

        const tg = window.Telegram.WebApp;
        tg.expand(); tg.ready();

        let userInfo = null;

        async function init() {
            const uid = tg.initDataUnsafe?.user?.id;
            if (!uid) {
                document.body.innerHTML = '<div class="empty-state">Veuillez ouvrir cette application directement depuis Telegram.</div>';
                return;
            }

            try {
                const res = await fetch(`/api/user-info?userId=telegram_${uid}&t=${Date.now()}`);
                userInfo = await res.json();
                
                if (!userInfo.isLivreur && !userInfo.isAdmin) {
                    document.body.innerHTML = '<div class="empty-state">Accès strictement réservé aux livreurs certifiés.</div>';
                    return;
                }

                updateAvailUI();
                await refreshOrders();
                document.getElementById('loading-screen').style.opacity = '0';
                setTimeout(() => document.getElementById('loading-screen').remove(), 500);
            } catch (e) {
                console.error(e);
                document.getElementById('loading-screen').innerHTML = '<p style="font-weight:800; font-size:13px; color:#ff4444;">Erreur de connexion au serveur.</p>';
            }
        }

        function switchTab(tab) {
            document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            
            if (tab === 'deliveries') {
                document.querySelector('.tab-item:nth-child(1)').classList.add('active');
                document.getElementById('tab-deliveries').style.display = 'block';
                refreshOrders();
            } else if (tab === 'chat') {
                document.querySelector('.tab-item:nth-child(2)').classList.add('active');
                document.getElementById('tab-chat').style.display = 'block';
                renderChatTabList();
            } else if (tab === 'history') {
                document.querySelector('.tab-item:nth-child(3)').classList.add('active');
                document.getElementById('tab-history').style.display = 'block';
                loadHistory();
            }
            try { tg.HapticFeedback.selectionChanged(); } catch(e){}
        }

        function updateAvailUI() {
            const dot = document.getElementById('avail-dot');
            const text = document.getElementById('avail-text');
            if (userInfo.isAvailable) {
                dot.className = 'status-dot status-online';
                text.innerText = t('available_caps', {default: 'DISPONIBLE'});
            } else {
                dot.className = 'status-dot status-offline';
                text.innerText = t('unavailable_caps', {default: 'INDISPONIBLE'});
            }
        }

        async function toggleAvailability() {
            userInfo.isAvailable = !userInfo.isAvailable;
            updateAvailUI();
            try { tg.HapticFeedback.impactOccurred('medium'); } catch(e){}
            
            try {
                await fetch('/api/livreur/set-availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: `telegram_${tg.initDataUnsafe.user.id}`, available: userInfo.isAvailable })
                });
            } catch (e) {}
        }

        async function refreshOrders() {
            if (!tg.initDataUnsafe?.user?.id) return;
            const uid = tg.initDataUnsafe.user.id;
            try {
                const [activeRes, availRes] = await Promise.all([
                    fetch(`/api/livreur/orders?userId=telegram_${uid}&lang=${window.currentLang || 'fr'}`),
                    fetch(`/api/livreur/available-orders?city=${userInfo?.currentCity || 'all'}&lang=${window.currentLang || 'fr'}`)
                ]);

                const active = await activeRes.json();
                const available = await availRes.json();

                window.lastActiveOrders = active;

                renderActive(active);
                renderAvailable(available);

                // Si le chat tab est actif, on le met à jour aussi en direct
                const chatTab = document.getElementById('tab-chat');
                if (chatTab && chatTab.style.display === 'block') {
                    renderChatTabList();
                }
            } catch(e){}
        }

        function safeQuote(str) {
            return (str || '').replace(/"/g, '&quot;');
        }

        function renderActive(list) {
            const cont = document.getElementById('active-orders-list');
            if (!list.length) {
                cont.innerHTML = '<div class="empty-state">Aucune livraison en cours.</div>';
                return;
            }

            // Mémorisation de l'état des modules de chat ouverts et du texte saisi pour éviter les coupures de focus
            const stateMap = {};
            const existingCards = cont.querySelectorAll('.order-card');
            existingCards.forEach(d => {
                const oid = d.getAttribute('data-id');
                const mod = document.getElementById(`chat-module-${oid}`);
                const inp = document.getElementById(`chat-input-${oid}`);
                if (oid && mod && inp) {
                    stateMap[oid] = {
                        isOpen: mod.style.display === 'block',
                        text: inp.value,
                        isFocused: document.activeElement === inp
                    };
                }
            });

            cont.innerHTML = '';
            list.forEach(o => {
                const d = document.createElement('div'); d.className = 'order-card';
                d.setAttribute('data-id', o.id);
                
                const prevState = stateMap[o.id] || {};
                const h = o.chatHistory;
                const count = h ? h.count : (parseInt(o.chat_count) || 0);
                
                let chatSection = '';
                if (h) {
                    chatSection = `
                        <div class="chat-history-box" id="chat-box-${o.id}">
                            <span style="opacity:0.4; font-size:10px;">Dernier échange (${count}/6) :</span><br>
                            <b style="color:${h.senderRole === 'client' ? '#00ff88' : 'var(--accent)'}">${h.senderRole === 'client' ? t('client', {default: 'Client'}) : t('you', {default: 'Vous'})} :</b> <i>${h.lastMessage}</i>
                        </div>
                    `;
                } else if (count > 0) {
                    chatSection = `
                        <div class="chat-history-box" id="chat-box-${o.id}">
                            <span style="opacity:0.4; font-size:10px;">Discussion entamée (${count}/6)</span>
                        </div>
                    `;
                } else {
                    chatSection = `
                        <div class="chat-history-box" id="chat-box-${o.id}" style="display:none;"></div>
                    `;
                }

                d.innerHTML = `
                    <div class="order-header">
                        <div class="order-id">#${o.id.slice(-5)}</div>
                        <div class="order-time">${new Date(o.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div class="order-address"><span>📍</span>${o.address}</div>
                    <div class="order-items">${o.product_name}</div>
                    
                    <div style="font-size:10px; font-weight:900; color:var(--accent); margin-bottom:8px; opacity:0.8; letter-spacing:1px;">APPROCHE CLIENT :</div>
                    <div class="btn-group" style="grid-template-columns: repeat(3, 1fr); gap:6px; margin-bottom:8px;">
                        <button class="btn-action btn-secondary" style="height:36px; font-size:11px;" onclick="notifyEta('${o.id}', '1h')">⏰ -1h</button>
                        <button class="btn-action btn-secondary" style="height:36px; font-size:11px;" onclick="notifyEta('${o.id}', '30m')">⏳ 30m</button>
                        <button class="btn-action btn-secondary" style="height:36px; font-size:11px;" onclick="notifyEta('${o.id}', '10m')">⏳ 10m</button>
                    </div>
                    <div class="btn-group" style="margin-bottom:15px;">
                        <button class="btn-action btn-secondary" onclick="notifyEta('${o.id}', '5m')">⚡ 5 MIN</button>
                        <button class="btn-action btn-secondary" onclick="notifyEta('${o.id}', 'here')">📍 ARRIVÉ</button>
                    </div>

                    <div class="btn-group" style="margin-bottom:10px;">
                        <button class="btn-action btn-primary btn-full" onclick="updateStatus('${o.id}', 'delivered')">✅ MARQUER LIVRÉ</button>
                        <button class="btn-action btn-secondary" onclick="openNav('${o.address}')">🗺 NAVIGUER</button>
                        <button class="btn-action btn-secondary" onclick="toggleChatModule('${o.id}')">💬 CHAT (${count}/6)</button>
                    </div>
                    
                    <div class="btn-group" style="grid-template-columns:1fr 1fr; gap:10px;">
                        <button class="btn-action btn-secondary" style="height:38px; font-size:11px; color:#ffaa00; border-color:rgba(255,170,0,0.2);" onclick="updateStatus('${o.id}', 'abandoned')">⚠️ REMETTRE</button>
                        <button class="btn-action btn-secondary" style="height:38px; font-size:11px; color:#ff4444; border-color:rgba(255,68,68,0.2);" onclick="updateStatus('${o.id}', 'cancelled')">🚩 ANNULER</button>
                    </div>

                    <div class="chat-module" id="chat-module-${o.id}" style="display:${prevState.isOpen ? 'block' : 'none'};">
                        <div style="font-size:10px; font-weight:900; opacity:0.5; margin-bottom:8px; letter-spacing:1px;">MESSAGERIE ANONYME :</div>
                        ${chatSection}
                        <div class="chat-input-group">
                            <input type="text" class="chat-input" id="chat-input-${o.id}" value="${safeQuote(prevState.text)}" placeholder="Votre message au client..." data-i18n-placeholder="msg_to_client" onkeydown="if(event.key==='Enter') sendChatMessage('${o.id}')">
                            <button class="btn-send" onclick="sendChatMessage('${o.id}')">ENVOYER</button>
                        </div>
                        <div style="font-size:9px; opacity:0.3; margin-top:6px; text-align:center;">Le client verra ce message sans connaître votre numéro.</div>
                    </div>
                `;
                cont.appendChild(d);

                if (prevState.isFocused) {
                    setTimeout(() => {
                        const inp = document.getElementById(`chat-input-${o.id}`);
                        if (inp) {
                            inp.focus();
                            inp.selectionStart = inp.selectionEnd = inp.value.length;
                        }
                    }, 20);
                }
            });
        }

        function toggleChatModule(id) {
            const mod = document.getElementById(`chat-module-${id}`);
            if (mod) {
                const isHidden = window.getComputedStyle(mod).display === 'none';
                mod.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    setTimeout(() => document.getElementById(`chat-input-${id}`)?.focus(), 50);
                }
                try { tg.HapticFeedback.selectionChanged(); } catch(e){}
            }
        }

        async function sendChatMessage(id) {
            const input = document.getElementById(`chat-input-${id}`);
            const text = input?.value?.trim();
            if (!text) return;

            input.disabled = true;
            try {
                const res = await fetch('/api/livreur/send-chat-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: `telegram_${tg.initDataUnsafe?.user?.id}`,
                        orderId: id,
                        text: text
                    })
                });
                const data = await res.json();
                input.disabled = false;
                
                if (data.error) {
                    tg.showAlert(data.error);
                } else {
                    input.value = '';
                    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
                    refreshOrders();
                }
            } catch (e) {
                input.disabled = false;
                tg.showAlert(t('msg_erreur_r_seau_lors_d', "Erreur réseau lors de l'envoi."));
            }
        }

        function renderChatTabList() {
            const list = window.lastActiveOrders || [];
            const cont = document.getElementById('chat-active-list');
            if (!cont) return;
            if (!list.length) {
                cont.innerHTML = '<div class="empty-state">Aucune discussion active en cours.</div>';
                return;
            }
            cont.innerHTML = '';
            list.forEach(o => {
                const d = document.createElement('div');
                d.className = 'order-card';
                d.style.marginBottom = '12px';
                
                const h = o.chatHistory;
                const count = h ? h.count : (parseInt(o.chat_count) || 0);
                
                let chatHistoryHtml = '';
                if (h) {
                    chatHistoryHtml = `
                        <div class="chat-history-box" id="tab-chat-box-${o.id}">
                            <span style="opacity:0.4; font-size:10px;">Dernier échange (${count}/6) :</span><br>
                            <b style="color:${h.senderRole === 'client' ? 'var(--accent)' : '#00ff88'}">${h.senderRole === 'client' ? t('client', {default: 'Client'}) : t('you', {default: 'Vous'})} :</b> <i>${h.lastMessage}</i>
                        </div>
                    `;
                } else if (count > 0) {
                    chatHistoryHtml = `
                        <div class="chat-history-box" id="tab-chat-box-${o.id}">
                            <span style="opacity:0.4; font-size:10px;">Discussion entamée (${count}/6)</span>
                        </div>
                    `;
                } else {
                    chatHistoryHtml = `
                        <div class="chat-history-box" id="tab-chat-box-${o.id}">
                            <span style="opacity:0.4; font-size:10px;">Aucun message échangé (${count}/6)</span>
                        </div>
                    `;
                }

                d.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="font-weight:900; font-size:14px;"><i class="ph-fill ph-receipt"></i> Commande #${o.id.slice(-5).toUpperCase()}</div>
                        <div style="font-size:11px; opacity:0.6; font-weight:800; color:var(--accent);">${count}/6 msgs</div>
                    </div>
                    <div style="font-size:12px; opacity:0.7; margin-bottom:12px;"><b>Adresse :</b> ${o.address}</div>
                    ${chatHistoryHtml}
                    <div class="chat-input-group" style="margin-top:12px; display:flex; gap:8px;">
                        <input type="text" class="chat-input" id="tab-chat-input-${o.id}" placeholder="Message au client..." onkeydown="if(event.key==='Enter') sendTabChatMessage('${o.id}')"
                            style="flex:1; background:rgba(0,0,0,0.4); border:1px solid var(--border); border-radius:12px; color:#fff; padding:10px 14px; font-size:13px; outline:none;">
                        <button class="btn-send" onclick="sendTabChatMessage('${o.id}')" 
                            style="background:var(--accent); border:none; border-radius:12px; color:#fff; padding:0 15px; font-size:12px; font-weight:800; cursor:pointer;">ENVOYER</button>
                    </div>
                `;
                cont.appendChild(d);
            });
        }

        async function sendTabChatMessage(orderId) {
            const input = document.getElementById(`tab-chat-input-${orderId}`);
            const text = input?.value?.trim();
            if (!text) return;
            input.disabled = true;
            try {
                const res = await fetch('/api/livreur/send-chat-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: `telegram_${tg.initDataUnsafe.user.id}`, orderId, text })
                });
                const data = await res.json();
                input.disabled = false;
                if (data.error) {
                    tg.showAlert(data.error);
                } else {
                    input.value = '';
                    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
                    refreshOrders();
                }
            } catch(e) {
                input.disabled = false;
                tg.showAlert(t('msg_erreur_r_seau', "Erreur réseau"));
            }
        }

        function renderAvailable(list) {
            const cont = document.getElementById('available-orders-list');
            cont.innerHTML = list.length ? '' : '<div class="empty-state">Aucune commande disponible dans votre secteur.</div>';
            list.forEach(o => {
                const d = document.createElement('div'); d.className = 'order-card';
                d.innerHTML = `
                    <div class="order-header">
                        <div class="order-id">#${o.id.slice(-5)}</div>
                        <div class="order-time" style="color:var(--accent); font-weight:900;">${o.total_price}€</div>
                    </div>
                    <div class="order-address"><span>📍</span>${o.address}</div>
                    <button class="btn-action btn-primary btn-full" onclick="takeOrder('${o.id}')">📦 ACCEPTER LA COURSE</button>
                `;
                cont.appendChild(d);
            });
        }

        async function loadHistory() {
            const cont = document.getElementById('history-orders-list');
            cont.innerHTML = '<div class="empty-state">Chargement de l\'historique...</div>';
            const uid = tg.initDataUnsafe?.user?.id;
            if (!uid) return;
            try {
                const res = await fetch(`/api/livreur/history?userId=telegram_${uid}`);
                const list = await res.json();
                cont.innerHTML = list.length ? '' : '<div class="empty-state">Aucun historique de livraison disponible.</div>';
                let total = 0;
                list.forEach(o => {
                    total += parseFloat(o.total_price || 0);
                    const d = document.createElement('div'); d.className = 'order-card';
                    d.innerHTML = `
                        <div class="order-header" style="margin-bottom:8px;">
                            <div class="order-id">#${o.id.slice(-5)}</div>
                            <div class="order-time" style="color:#00ff88; font-weight:900; opacity:1;">+${o.total_price}€</div>
                        </div>
                        <div class="order-address" style="opacity:0.7; font-size:12px; margin-bottom:8px;"><span>📍</span>${o.address}</div>
                        <div class="order-items" style="margin-bottom:0; font-size:12px; opacity:0.5; padding-left:12px; border-left-color:#00ff88;">${o.product_name}</div>
                    `;
                    cont.appendChild(d);
                });
                
                if (list.length > 0) {
                    const sum = document.createElement('div');
                    sum.style.cssText = 'background:rgba(0,255,136,0.05); border:1px solid rgba(0,255,136,0.3); border-radius:25px; padding:20px; text-align:center; margin-bottom:25px;';
                    sum.innerHTML = `<div style="font-size:11px; font-weight:900; opacity:0.5; color:#00ff88; letter-spacing:1px; margin-bottom:5px;">TOTAL ENCAISSÉ</div><div style="font-size:24px; font-weight:900; color:#00ff88;">${total.toFixed(2)}€</div>`;
                    cont.prepend(sum);
                }
            } catch (e) {
                cont.innerHTML = '<div class="empty-state">Erreur lors de la récupération de l\'historique.</div>';
            }
        }

        async function takeOrder(id) {
            tg.showConfirm(t('msg_voulez_vous_prendre', "Voulez-vous prendre cette livraison ?"), async (ok) => {
                if (!ok) return;
                try {
                    const res = await fetch('/api/livreur/take-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: `telegram_${tg.initDataUnsafe.user.id}`, orderId: id })
                    });
                    if (res.ok) {
                        try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
                        refreshOrders();
                    } else {
                        tg.showAlert(t('msg_cette_commande_n_est', "Cette commande n'est plus disponible."));
                    }
                } catch (e) {}
            });
        }

        async function updateStatus(id, status) {
            const msgs = {
                'delivered': "Confirmer la livraison de cette commande ?",
                'abandoned': "Remettre cette livraison dans la file d'attente globale ?",
                'cancelled': "Annuler définitivement cette commande (incident/stock indisponible) ?"
            };
            tg.showConfirm(msgs[status] || "Confirmer l'action ?", async (ok) => {
                if (!ok) return;
                try {
                    await fetch('/api/livreur/update-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            orderId: id, 
                            status: status,
                            userId: `telegram_${tg.initDataUnsafe.user.id}` 
                        })
                    });
                    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
                    refreshOrders();
                } catch (e) {}
            });
        }

        async function notifyEta(id, timeCode) {
            const timeLabels = { 
                '1h': "dans moins d'1h",
                '30m': "dans 30 minutes",
                '10m': "dans 10 minutes",
                '5m': "dans 5 minutes", 
                'here': "Arrivé sur place" 
            };
            tg.showConfirm(`Informer le client : ${timeLabels[timeCode]} ?`, async (ok) => {
                if (!ok) return;
                try {
                    await fetch('/api/livreur/notify-eta', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: `telegram_${tg.initDataUnsafe.user.id}`, orderId: id, timeCode })
                    });
                    try { tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
                    tg.showAlert(t('msg_notification_d_appro', "Notification d'approche envoyée au client avec succès !"));
                } catch(e){}
            });
        }

        function openNav(addr) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
            tg.openLink(url);
        }

        init();
        setInterval(() => {
            if (document.getElementById('tab-deliveries').style.display !== 'none') {
                refreshOrders();
            }
        }, 30000);
    