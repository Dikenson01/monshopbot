
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.expand();
            tg.ready();
        }
        let TOKEN = localStorage.getItem('admin_token');
        let chartInstances = {};
        window.lastAnalytics = null;
        window.currentTimeframe = 'hour';

        async function checkAuthAndRedirect() {
            const tg = window.Telegram?.WebApp;
            if (!TOKEN && tg && tg.initData) {
                try {
                    const res = await fetch('/api/login-telegram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ initData: tg.initData })
                    });
                    const data = await res.json();
                    if (res.ok && data.token) {
                        localStorage.setItem('admin_token', data.token);
                        TOKEN = data.token;
                        return true;
                    }
                } catch (e) {
                    console.error("Auto-login failed:", e);
                }
            }
            if (!TOKEN) {
                window.location.href = '/';
                return false;
            }
            return true;
        }

        // Cache : sections déjà chargées
        const _loadedSections = {};

        async function api(path, method = 'GET', body = null, silent = false) {
            try {
                const opt = {
                    method,
                    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
                };
                if (body) opt.body = JSON.stringify(body);
                const url = '/api' + path + (path.includes('?') ? '&' : '?') + 't=' + Date.now();
                const r = await fetch(url, opt);

                if (r.status === 401) {
                    logout();
                    return;
                }

                if (!r.ok) {
                    const err = await r.json();
                    throw new Error(err.error || 'Erreur API');
                }
                return await r.json();
            } catch (e) {
                console.error('[API Error]:', e);
                throw e;
            }
        }


        // ========== TOAST & MODAL ==========
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = 'toast ' + type;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
        }

        let _modalResolve = null;
        function showModal(title, message) {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBody').innerHTML = `<p id="modalMessage">${message}</p>`;
            document.getElementById('modalOverlay').classList.add('active');
            document.getElementById('modalConfirmBtn').textContent = "Confirmer";
            return new Promise(resolve => { _modalResolve = resolve; });
        }

        /**
         * Affiche une modale de confirmation stylisée (remplace confirm())
         */
        async function showConfirmModal(title, message, confirmLabel = "Confirmer") {
            const ok = await showModal(title, message);
            if (ok) return true;
            return false;
        }

        /**
         * Affiche une modale avec un formulaire (remplace prompt())
         * fields: [{ label, id, type, value, placeholder }]
         */
        function showFormModal(title, fields, onSave) {
            document.getElementById('modalTitle').textContent = title;
            let html = '<div style="display:flex; flex-direction:column; gap:15px; margin-top:10px;">';
            fields.forEach(f => {
                html += `
                    <div>
                        <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-muted);">${f.label}</label>
                        <input type="${f.type || 'text'}" id="modal_f_${f.id}" value="${f.value || ''}" placeholder="${f.placeholder || ''}" style="width:100%;">
                    </div>
                `;
            });
            html += '</div>';
            document.getElementById('modalBody').innerHTML = html;
            document.getElementById('modalConfirmBtn').textContent = "Sauvegarder";
            document.getElementById('modalOverlay').classList.add('active');

            return new Promise(resolve => {
                _modalResolve = async (result) => {
                    if (!result) {
                        resolve(null);
                    } else {
                        const vals = {};
                        fields.forEach(f => {
                            vals[f.id] = document.getElementById('modal_f_' + f.id).value;
                        });
                        if (onSave) await onSave(vals);
                        resolve(vals);
                    }
                };
            });
        }

        function closeModal(result) {
            document.getElementById('modalOverlay').classList.remove('active');
            if (_modalResolve) { _modalResolve(result); _modalResolve = null; }
        }

        // ========== MOBILE SIDEBAR ==========
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebarBackdrop');
            console.log('[SIDEBAR] Toggle requested', !!sidebar, !!backdrop);
            if (!sidebar || !backdrop) return;
            
            sidebar.classList.toggle('open');
            backdrop.classList.toggle('active');
        }

        // --- AUTO-REFRESH L'AFFICHAGE (SYNC) ---
        let lastUserActivity = Date.now();
        let isRefreshing = false;

        // Détecte l'activité utilisateur pour suspendre l'auto-refresh
        ['click', 'keydown', 'scroll'].forEach(evt => {
            document.addEventListener(evt, () => { lastUserActivity = Date.now(); }, { passive: true });
        });

        // Refresh toutes les 15s si l'utilisateur n'a pas interagi depuis 5s
        setInterval(() => {
            if (isRefreshing) return;
            const timeSinceActivity = Date.now() - lastUserActivity;
            if (timeSinceActivity < 5000) return; // Skip si activité récente

            const activeSection = document.querySelector('.section.active');
            if (activeSection && !document.body.classList.contains('loading')) {
                const id = activeSection.id.replace('section-', '');
                if (id === 'overview' || id === 'logistique' || id === 'livreurs' || id === 'orders' || id === 'users' || id === 'insights' || id === 'products') {
                    isRefreshing = true;
                    loadData(id, true).finally(() => { isRefreshing = false; });
                }
            }
        }, 15000);

        function safeDate(val) {
            if (!val) return new Date();
            if (val._seconds) return new Date(val._seconds * 1000);
            if (typeof val === 'string') {
                // Safari fix: replace space with T
                return new Date(val.replace(' ', 'T'));
            }
            return new Date(val);
        }

        window.switchSection = switchSection;
        async function switchSection(id) {
            // Mapping for titles
            const titles = {
                'overview': 'Accueil',
                'users': 'Utilisateurs',
                'products': 'Produits',
                'logistics': 'Logistique',
                'logistique': 'Logistique',
                'insights': 'Statistiques',
                'broadcast': 'Diffusion',
                'suppliers': 'Fournisseurs',
                'features': 'Guide',
                'settings': 'Paramètres'
            };

            // Unified ID for logistics
            const sectionId = (id === 'logistics' || id === 'logistique') ? 'logistique' : id;

            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item, .m-nav-item').forEach(n => n.classList.remove('active'));

            const target = document.getElementById('section-' + sectionId);
            if (target) {
                target.classList.add('active');
            }

            // Update title
            const titleEl = document.getElementById('section-title');
            if (titleEl && titles[sectionId]) titleEl.innerText = titles[sectionId];

            // Activate Sidebar items
            const sideItem = document.getElementById('side-nav-' + sectionId);
            if (sideItem) sideItem.classList.add('active');

            // Activate Mobile Nav items
            const mItem = document.getElementById('m-nav-' + sectionId);
            if (mItem) mItem.classList.add('active');

            // Special Logistics Logic
            if (sectionId === 'logistique') {
                const s = document.getElementById('q_filter_sys_orders');
                if (s) { s.value = ''; s.setAttribute('readonly', 'true'); }
                const activeTab = document.querySelector('#section-logistique .btn-sm.active');
                const tabId = activeTab ? activeTab.id.replace('btn-tab-', '') : 'orders';
                switchLogisticsTab(tabId);
            }
            if (sectionId === 'users') {
                const s = document.getElementById('q_filter_sys_users');
                if (s) { s.value = ''; s.setAttribute('readonly', 'true'); }
            }

            // Scroll en haut de la page
            document.querySelector('.main').scrollTo(0, 0);

            // Mémoriser la section dans l'URL
            location.hash = sectionId;

            if (_loadedSections[sectionId]) {
                // Déjà chargé → rafraîchir en arrière-plan sans bloquer
                loadData(sectionId, true);
            } else {
                // Premier chargement → attendre les données
                await loadData(sectionId);
                _loadedSections[sectionId] = true;
            }
        }

        function _isMobile() { return window.innerWidth <= 900; }

        function renderOrdersTable(ordersToRender) {
            const s = window.appSettings || {};
            const livreurOptions = (window._cachedLivreurs || []).map(l => `<option value="${l.id || l.doc_id}">${l.first_name || 'Livreur'}</option>`).join('');

            // --- Helper: status label ---
            function getStatusLabel(status) {
                if (status === 'pending') return s.status_pending_label || 'EN ATTENTE';
                if (status === 'taken') return s.status_taken_label || 'PRIS EN CHARGE';
                if (status === 'delivered') return s.status_delivered_label || 'LIVRÉE';
                if (status === 'cancelled') return s.status_cancelled_label || 'ANNULÉE';
                if (status === 'arrival_1h') return "ARRIVE -1H";
                if (status === 'arrival_30min') return "30 MIN";
                if (status === 'arrival_10min') return '10 MIN';
                if (status === 'arrival_5min') return '5 MIN';
                if (status === 'arrived') return 'ARRIVÉ';
                return status.toUpperCase();
            }

            function fmtDate(val) {
                if (!val) return '—';
                const d = safeDate(val);
                if (isNaN(d.getTime())) return '—';
                return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            }

            // ========== DESKTOP TABLE ==========
            const tbody = document.querySelector('#orderTable tbody');
            if (tbody) {
                tbody.innerHTML = ordersToRender.map(o => {
                    const label = getStatusLabel(o.status);
                    const createdTime = fmtDate(o.created_at);
                    const deliveredTime = fmtDate(o.delivered_at);

                    return `
                    <tr style="border-bottom: 2px solid #222;">
                        <td data-label="Plateforme" style="display:none;"><span class="badge" style="background:rgba(0,136,204,0.1); color:#0088cc; border:1px solid currentColor; font-size:9px; font-weight:800; padding:1px 5px;">TG</span></td>
                        <td data-label="Identité">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <b>${o.first_name}</b>
                                <button class="btn btn-sm btn-outline" style="border-color:#0088cc; color:#0088cc; font-size:10px; padding:2px 6px; width:fit-content;" onclick="contactUser('${o.platform}', '${o.username || ''}', '${o.user_id ? o.user_id.split('_')[1] : ''}', '${o.phone || ''}', '${o.user_id}')">💬 Contact</button>
                            </div>
                        </td>
                        <td data-label="Statut & Actions" style="background: rgba(255,165,0,0.05); min-width: 160px;">
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                ${o.is_approved === false ? `<button class="btn btn-accent btn-sm" style="width:100%; background:linear-gradient(135deg, #00b400, #008000); box-shadow:0 4px 10px rgba(0,180,0,0.3);" onclick="approveUserAccount('${o.user_id}', '${o.first_name}')">✅ ACCORDER L'ACCÈS</button>` : ''}
                                <select onchange="updateOrderStatus('${o.id}', this.value)" style="margin:0; padding:4px; font-size:11px; width:100%;">
                                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>${s.status_pending_label || 'EN ATTENTE'}</option>
                                    <option value="taken" ${o.status === 'taken' ? 'selected' : ''}>${s.status_taken_label || 'PRIS EN CHARGE'}</option>
                                    <option value="arrival_1h" ${o.status === 'arrival_1h' ? 'selected' : ''}>🚚 Arrivée -1h</option>
                                    <option value="arrival_30min" ${o.status === 'arrival_30min' ? 'selected' : ''}>⏳ 30 min</option>
                                    <option value="arrival_10min" ${o.status === 'arrival_10min' ? 'selected' : ''}>⏳ 10 min</option>
                                    <option value="arrival_5min" ${o.status === 'arrival_5min' ? 'selected' : ''}>⚡ 5 min</option>
                                    <option value="arrived" ${o.status === 'arrived' ? 'selected' : ''}>📍 Arrivé</option>
                                    <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>${s.status_delivered_label || 'LIVRÉE'}</option>
                                    <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>${s.status_cancelled_label || 'ANNULÉE'}</option>
                                </select>
                                <div style="margin-top:4px;">
                                    ${!o.livreur_name ? `
                                        <select onchange="assignDriver('${o.id}', this.value, this.options[this.selectedIndex].text)" style="margin:0; padding:4px; font-size:10px; background:rgba(255,165,0,0.1); border:1px solid orange; width:100%;">
                                            <option value="">👤 Assigner livreur...</option>
                                            ${livreurOptions}
                                        </select>
                                    ` : `
                                        <div style="display:flex; flex-direction:column; gap:4px;">
                                            <small style="font-size:10px; color:var(--accent); font-weight:900; background:rgba(0,180,255,0.05); padding:4px; border-radius:4px;">🚴 ${o.livreur_name}</small>
                                            <select onchange="if(this.value) assignDriver('${o.id}', this.value, this.options[this.selectedIndex].text)" style="margin:0; padding:4px; font-size:10px; background:rgba(255,165,0,0.1); border:1px solid orange; width:100%; color:orange; border-radius:4px;">
                                                <option value="">🔄 Réassigner...</option>
                                                ${livreurOptions}
                                            </select>
                                        </div>
                                    `}
                                </div>
                                <button class="btn btn-outline btn-sm" style="color:var(--danger); margin-top:5px; border-color:rgba(255,0,0,0.2); width:100%;" onclick="delOrder('${o.id}')">🗑️ Supprimer</button>
                            </div>
                        </td>
                        <td data-label="Suivi" style="text-align:center;">
                            <span class="badge badge-${o.status}">${label}</span>
                            ${(() => { if (!o.created_at) return ''; const diff = (new Date() - new Date(o.created_at)) / (1000 * 60 * 60); if (diff < 24) return '<div style="margin-top:4px; font-size:10px; font-weight:900; color:#ff0050; border:1px solid #ff0050; border-radius:4px; padding:1px 4px; display:inline-block;">🔥 NOUVEAU</div>'; return ''; })()}
                        </td>
                        <td data-label="Produit">${o.product_name} (x${o.quantity})</td>
                        <td data-label="Total"><b>${o.total_price}€</b></td>
                        <td data-label="Adresse"><small style="font-size:11px; white-space: normal; display: block; max-width: 150px;">${o.address || '—'}</small></td>
                        <td data-label="Ville"><small>${o.city || '—'}</small></td>
                        <td data-label="Créé le"><small>🕐 ${createdTime}</small>${o.scheduled_at ? `<br><span style="padding:2px 6px; background:rgba(255,165,0,0.2); border:1px solid orange; color:orange; font-size:10px; border-radius:4px; font-weight:bold; margin-top:4px; display:inline-block;">📅 ${o.scheduled_at}</span>` : ''}</td>
                        <td data-label="Livrable"><small>${o.status === 'delivered' ? '✅ ' + deliveredTime : (o.livreur_name ? '⏳ En cours' : '—')}</small>${o.livreur_name ? `<br><small style="color:var(--accent); font-weight:700;">🚴 ${o.livreur_name}</small>` : ''}</td>
                    </tr>`;
                }).join('');
            }

            // ========== MOBILE CARDS ==========
            const mobileFeed = document.getElementById('mobileOrderFeed');
            if (mobileFeed) {
                mobileFeed.innerHTML = ordersToRender.map(o => {
                    const label = getStatusLabel(o.status);
                    const createdTime = fmtDate(o.created_at);
                    const deliveredTime = fmtDate(o.delivered_at);
                    const isNew = o.created_at && ((new Date() - new Date(o.created_at)) / (1000*60*60) < 24);
                    const platformColor = '#0088cc';
                    const platformBg = 'rgba(0,136,204,0.1)';

                    return `
                    <div class="m-order-card">
                        <!-- Header: client + statut -->
                        <div class="m-order-header">
                            <div class="m-order-client">
                                <div class="m-order-avatar">${o.first_name ? o.first_name[0].toUpperCase() : '?'}</div>
                                <div>
                                    <div class="m-order-name">${o.first_name}
                                        <span class="m-order-platform" style="color:${platformColor}; background:${platformBg};">${o.platform?.toUpperCase() || 'TG'}</span>
                                    </div>
                                    <div style="display:flex; gap:8px; align-items:center;">
                                        <div class="m-order-time">🕐 ${createdTime}${o.scheduled_at ? ' · 📅 ' + o.scheduled_at : ''}</div>
                                        <button class="btn btn-sm btn-outline" style="border-color:#0088cc; color:#0088cc; font-size:9px; padding:1px 4px; border-radius:4px; height:auto; line-height:1;" onclick="contactUser('${o.platform}', '${o.username || ''}', '${o.user_id ? o.user_id.split('_')[1] : ''}', '${o.phone || ''}', '${o.user_id}')">💬 Contact</button>
                                    </div>
                                    ${isNew ? '<span class="m-order-new-tag">🔥 NOUVEAU</span>' : ''}
                                </div>
                            </div>
                            <span class="m-order-badge ${o.status}">${label}</span>
                        </div>

                        <!-- Produit + Prix -->
                        <div class="m-order-body">
                            <div class="m-order-product">
                                <div>
                                    <div class="m-order-product-name">${o.product_name}</div>
                                    <div class="m-order-product-qty">Quantité: ${o.quantity}</div>
                                </div>
                                <div class="m-order-product-price">${o.total_price}€</div>
                            </div>

                            <div class="m-order-details">
                                <div class="m-order-detail-item">
                                    <span class="m-order-detail-label">📍 Adresse</span>
                                    <span class="m-order-detail-value">${o.address || '—'}</span>
                                </div>
                                <div class="m-order-detail-item">
                                    <span class="m-order-detail-label">🏙️ Ville</span>
                                    <span class="m-order-detail-value">${o.city || '—'}</span>
                                </div>
                                ${o.livreur_name ? `
                                <div class="m-order-detail-item">
                                    <span class="m-order-detail-label">🚴 Livreur</span>
                                    <span class="m-order-detail-value" style="color:var(--accent);">${o.livreur_name}</span>
                                </div>` : ''}
                                ${o.status === 'delivered' ? `
                                <div class="m-order-detail-item">
                                    <span class="m-order-detail-label">✅ Livré</span>
                                    <span class="m-order-detail-value">${deliveredTime}</span>
                                </div>` : ''}
                            </div>

                        </div>

                        <!-- Actions -->
                        <div class="m-order-actions">
                            ${o.is_approved === false ? `<button class="m-btn m-btn-approve" style="flex:1;" onclick="approveUserAccount('${o.user_id}', '${o.first_name}')">✅ ACCORDER L'ACCÈS</button>` : ''}
                            <select onchange="updateOrderStatus('${o.id}', this.value)" style="flex:2;">
                                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>${s.status_pending_label || 'EN ATTENTE'}</option>
                                <option value="taken" ${o.status === 'taken' ? 'selected' : ''}>${s.status_taken_label || 'PRIS EN CHARGE'}</option>
                                <option value="arrival_1h" ${o.status === 'arrival_1h' ? 'selected' : ''}>🚚 -1h</option>
                                <option value="arrival_30min" ${o.status === 'arrival_30min' ? 'selected' : ''}>⏳ 30min</option>
                                <option value="arrival_10min" ${o.status === 'arrival_10min' ? 'selected' : ''}>⏳ 10min</option>
                                <option value="arrival_5min" ${o.status === 'arrival_5min' ? 'selected' : ''}>⚡ 5min</option>
                                <option value="arrived" ${o.status === 'arrived' ? 'selected' : ''}>📍 Arrivé</option>
                                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>${s.status_delivered_label || 'LIVRÉE'}</option>
                                <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>${s.status_cancelled_label || 'ANNULÉE'}</option>
                            </select>
                            ${!o.livreur_name ? `
                                <select onchange="assignDriver('${o.id}', this.value, this.options[this.selectedIndex].text)" style="flex:1;">
                                    <option value="">👤 Livreur</option>
                                    ${livreurOptions}
                                </select>
                            ` : `
                                <button class="m-btn m-btn-assign" onclick="assignDriver('${o.id}', '', '')">🔄</button>
                            `}
                            <button class="m-btn m-btn-danger" onclick="delOrder('${o.id}')">🗑️</button>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        function renderReviewsTable(reviews) {
            const tbody = document.getElementById('reviews-tbody');
            const totalEl = document.getElementById('log-total-reviews');
            if (totalEl) totalEl.innerText = reviews.length;

            if (reviews.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center; color:var(--text-muted)">Aucun avis trouvé.</td></tr>';
                const mf = document.getElementById('mobileReviewsFeed');
                if (mf) mf.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">Aucun avis trouvé.</div>';
                return;
            }

            function getPhotoHtml(r) {
                let photos = r.photos;
                if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch (e) { photos = []; } }
                if (Array.isArray(photos) && photos.length > 0 && photos[0]) {
                    const fp = photos[0];
                    if (fp.startsWith('http') || fp.includes('/')) {
                        const isVid = fp.toLowerCase().match(/\.(mp4|mov|mkv)$/);
                        if (isVid) return `<video src="${fp}" style="width:60px; height:60px; object-fit:cover; border-radius:10px; border:1px solid var(--border);" muted onclick="window.open('${fp}')"></video>`;
                        return `<img src="${fp}" style="width:60px; height:60px; cursor:pointer; object-fit:cover; border-radius:10px; border:1px solid var(--border);" onclick="window.open('${fp}')">`;
                    }
                    return '<div style="padding:4px; background:var(--hover); border-radius:6px; font-size:10px; color:var(--text-muted); text-align:center; width:60px;">PHOTO TG</div>';
                }
                return '—';
            }

            // Desktop
            if (tbody) {
                tbody.innerHTML = reviews.map(r => {
                    const d = safeDate(r.created_at);
                    const date = !isNaN(d.getTime()) ? d.toLocaleString('fr-FR') : '—';
                    const stars = '⭐'.repeat(r.rating || 0);
                    return `<tr>
                        <td data-label="Date"><small>${date}</small></td>
                        <td data-label="Client"><div style="display:flex; flex-direction:column;"><b>${r.first_name}</b><small style="color:var(--text-muted)">@${r.username || '?'}</small></div></td>
                        <td data-label="Note"><div style="color:orange;">${stars}</div></td>
                        <td data-label="Commentaire"><div style="max-width:300px; font-size:13px; line-height:1.4;">${r.text || '<span style="color:var(--text-muted); font-style:italic;">Sans texte</span>'}</div></td>
                        <td data-label="Photo">${getPhotoHtml(r)}</td>
                        <td data-label="Actions"><button class="btn btn-danger btn-sm" onclick="delReview('${r.id}')">Supprimer</button></td>
                    </tr>`;
                }).join('');
            }

            // Mobile
            const mf = document.getElementById('mobileReviewsFeed');
            if (mf) {
                mf.innerHTML = reviews.map(r => {
                    const d = safeDate(r.created_at);
                    const date = !isNaN(d.getTime()) ? d.toLocaleString('fr-FR') : '—';
                    const stars = '⭐'.repeat(r.rating || 0);
                    return `
                    <div class="m-order-card">
                        <div class="m-order-header">
                            <div class="m-order-client">
                                <div class="m-order-avatar" style="background:linear-gradient(135deg, #f9a825, #ff6f00);">${r.first_name ? r.first_name[0].toUpperCase() : '?'}</div>
                                <div>
                                    <div class="m-order-name">${r.first_name}</div>
                                    <div class="m-order-time">${date}</div>
                                </div>
                            </div>
                            <div style="color:orange; font-size:14px;">${stars}</div>
                        </div>
                        <div style="padding:10px; background:rgba(255,255,255,0.03); border-radius:12px; margin-bottom:10px; font-size:14px; line-height:1.5;">
                            ${r.text || '<span style="color:var(--text-muted); font-style:italic;">Sans commentaire</span>'}
                        </div>
                        ${getPhotoHtml(r) !== '—' ? `<div style="margin-bottom:10px;">${getPhotoHtml(r)}</div>` : ''}
                        <div class="m-order-actions">
                            <button class="m-btn m-btn-danger" style="flex:1;" onclick="delReview('${r.id}')">🗑️ Supprimer</button>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        async function delReview(id) {
            if (!confirm("Voulez-vous supprimer cet avis ?")) return;
            try {
                const res = await api('/reviews/delete', 'POST', { id });
                if (res.success) {
                    showToast(t('dom_avis_supprim', "Avis supprimé ✅"));
                    loadData('reviews');
                }
            } catch (e) {
                showToast(t('dom_erreur_lors_de_la_su', "Erreur lors de la suppression ❌"), "error");
            }
        }


        function filterData(type, period, btn = null) {
            if (type === 'orders') {
                if (btn) {
                    const container = document.getElementById('orderFilterContainer');
                    if (container) {
                        container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                    }
                }

                if (!window._cachedOrders) return;
                let filtered = [...window._cachedOrders];
                const now = new Date();

                if (period !== 'all') {
                    filtered = filtered.filter(o => {
                        if (!o.created_at) return false;

                        // Robust date parsing for Supabase / Firebase
                        let d;
                        if (o.created_at._seconds) d = new Date(o.created_at._seconds * 1000);
                        else d = new Date(o.created_at);

                        if (isNaN(d.getTime())) return false; // Invalid Date

                        if (period === 'today') {
                            return d.toDateString() === now.toDateString();
                        } else if (period === 'week') {
                            const diffInMs = now.getTime() - d.getTime();
                            const diffInDays = diffInMs / (1000 * 3600 * 24);
                            return diffInDays <= 7;
                        } else if (period === 'month') {
                            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        }
                        return true;
                    });
                }
                
                let total = 0;
                filtered.forEach(o => {
                    if (o.status !== 'cancelled') {
                        total += parseFloat(o.total_price) || 0;
                    }
                });
                
                const totalEl = document.getElementById('orderTotalSum');
                if (totalEl) totalEl.innerText = total.toFixed(2) + ' €';
                
                renderOrdersTable(filtered);
            }
        }

        function updatePlatformStats() {
            const s = window.appStats || {};
            const setStat = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.innerText = (val !== undefined && val !== null) ? val : '—';
            };
            const platform = document.getElementById('insights-platform-filter')?.value || 'all';
            const analytics = window.lastAnalytics;
            
            if (analytics && platform !== 'all' && analytics.byPlatform && analytics.byPlatform[platform]) {
                const pf = analytics.byPlatform[platform];
                const filteredCA = (pf.ca || 0).toLocaleString('fr-FR') + ' €';
                const filteredCount = pf.count || 0;
                const filteredAvg = (parseFloat(pf.avgBasket) || 0).toFixed(2) + ' €';

                setStat('ovStatOrders', filteredCount);
                setStat('ovStatCA', filteredCA);
                setStat('statCA', filteredCA);
                
                const abEl = document.getElementById('avg-basket-size');
                if (abEl) abEl.innerText = filteredAvg;
            } else {
                setStat('ovStatOrders', s.totalOrders || 0);
                setStat('ovStatCA', (s.totalCA || 0).toLocaleString('fr-FR') + ' €');
                setStat('statCA', (s.totalCA || 0).toLocaleString('fr-FR') + ' €');
                
                const abEl = document.getElementById('avg-basket-size');
                if (abEl && s.avgBasket) abEl.innerText = (parseFloat(s.avgBasket) || 0).toFixed(2) + ' €';
            }
            
            setStat('ovStatUsers', s.totalUsers || 0);
            setStat('ovStatActive', s.activeUsers || 0);
            setStat('ovStatLivreurs', s.totalLivreurs || 0);
            setStat('statUsers', s.totalUsers || 0);
            setStat('statActive', s.activeUsers || 0);
            
            // Set Individual User Counters
            setStat('count-active', s.activeUsers || 0);
            setStat('count-pending', s.totalPending || 0);
            setStat('count-blocked', s.totalBlocked || 0);
        }

        async function loadData(id, silent = false) {
            // Lock: prevent concurrent non-silent loads of the same section
            const currentTab = window._currentMainTab || '';
            if (window._loadDataLock && !silent && currentTab === id) return;
            window._loadDataLock = true;
            window._currentMainTab = id;

            if (id === 'features') { window._loadDataLock = false; return; }
            if (id === 'logistique') {
                const isLivreurs = document.getElementById('btn-tab-livreurs')?.classList.contains('active');
                id = isLivreurs ? 'livreurs' : 'orders';
            }

            // Show loading indicator on section
            const section = document.getElementById('section-' + id) || document.getElementById('section-logistique');
            if (!silent && section) {
                // Ensure section is opaque even if we show a slight loading signal
                section.style.opacity = '1';
                section.classList.add('loading');
            }
            try {
                // Settings & Stats : Uniquement si nécessaire ou non silent
                if (!window.appSettings || (id === 'overview' && !silent)) {
                    window.appSettings = await api('/settings', 'GET', null, silent);
                    updateNavbarIcons();
                }

                if (id === 'overview' || id === 'insights' || id === 'users') {
                    const statsTask = api('/stats', 'GET', null, silent || (id !== 'overview' && id !== 'insights')).then(data => {
                        console.log('[STATS] Received:', data);
                        window.appStats = data;
                        if (data) {
                            if (document.getElementById('usersTotalCounter')) document.getElementById('usersTotalCounter').innerText = (data.totalUsers || 0) + ' clients';
                            if (document.getElementById('usersBlockedCounter')) document.getElementById('usersBlockedCounter').innerText = 'Bloqués: ' + (data.totalBlocked || 0);
                            if (document.getElementById('livreursTotalCounter')) document.getElementById('livreursTotalCounter').innerText = (data.totalLivreurs || 0) + ' livreurs';
                        }
                        return data;
                    }).catch(e => { console.warn("[STATS] Failed:", e); return null; });

                    if (id === 'overview' || id === 'insights' || id === 'users') await statsTask;
                }

                if (id === 'overview' || id === 'insights') {
                    updatePlatformStats();
                }

                if (id === 'users') {
                    const tab = window._userTab || 'active';
                    if (tab === 'blocked') {
                        try {
                            const blocked = await api('/users/blocked', 'GET', null, silent);
                            window._cachedUsers = blocked;
                            renderUsersTable(blocked);
                        } catch(e) { 
                            window._cachedUsers = [];
                            renderUsersTable([]);
                        }
                        // falls through to finally → loading removed
                    } else if (tab === 'pending') {
                        try {
                            const users = await api('/users/pending', 'GET', null, silent);
                            window._cachedUsers = users;
                            renderUsersTable(users);
                        } catch (e) {
                            window._cachedUsers = [];
                            renderUsersTable([]);
                        }
                        // falls through to finally → loading removed
                    } else {
                        // active tab
                        const users = await api(`/users?limit=100`, 'GET', null, silent);
                        window._cachedUsers = users;
                        renderUsersTable(users);
                    }
                }
                if (id === 'products') {
                    let products = [];
                    try {
                        products = await api('/products', 'GET', null, silent) || [];
                        await loadSupplierDropdown().catch(() => {});
                        window._cachedProducts = products;
                        let filtered = products;
                        if (window._productTab === 'props') {
                            filtered = products.filter(p => p.supplier_id && !p.is_available);
                        }

                        // Update Bundle Select
                        const bundleSelect = document.getElementById('bundle_offered_id');
                        if (bundleSelect) {
                            const currentVal = bundleSelect.value;
                            bundleSelect.innerHTML = '<option value="">-- Ce produit même --</option>' +
                                products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                            bundleSelect.value = currentVal;
                        }

                        if (window._productTab === 'stock') {
                            const stockBody = document.getElementById('stock-products-list-body');
                            if (stockBody) {
                                stockBody.innerHTML = products.map((p, idx) => {
                                    let mediaHtml = '';
                                    if (p.image_url && p.image_url.length > 5) {
                                        let firstUrl = p.image_url;
                                        try {
                                            if (p.image_url.startsWith('[') && p.image_url.endsWith(']')) {
                                                const arr = JSON.parse(p.image_url);
                                                if (arr.length > 0) {
                                                    firstUrl = typeof arr[0] === 'string' ? arr[0] : arr[0].url;
                                                }
                                            }
                                        } catch (e) {}
                                        const isVideo = firstUrl.match(/\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i);
                                        if (isVideo) {
                                            mediaHtml = `<video src="${firstUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" muted></video>`;
                                        } else {
                                            mediaHtml = `<img src="${firstUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">`;
                                        }
                                    } else {
                                        mediaHtml = '<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;font-size:20px;background:rgba(255,255,255,0.05);border-radius:6px;">📦</div>';
                                    }
                                    
                                    const stockVal = p.stock !== undefined && p.stock !== null ? p.stock : 0;
                                    const isAvailable = (p.is_active !== undefined) ? p.is_active : p.is_available;
                                    const statusLabel = isAvailable && stockVal > 0 
                                        ? '<span style="background:rgba(39,174,96,0.15); color:#27ae60; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700;">En vente</span>'
                                        : '<span style="background:rgba(231,76,60,0.15); color:#e74c3c; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700;">Indisponible / Épuisé</span>';
                                        
                                    return `
                                        <div class="card" id="stock-row-${p.id}" style="display:flex; flex-direction:column; align-items:center; padding:15px; background:rgba(255,255,255,0.02); border-radius:12px; text-align:center; position:relative;">
                                            <div style="margin-bottom:10px;">${mediaHtml}</div>
                                            <div style="font-weight:600; font-size:16px; margin-bottom:5px;">${p.name}</div>
                                            <div style="margin-bottom:10px;"><span class="badge" style="opacity:0.8;">${p.category || 'Standard'}</span></div>
                                            <div style="font-size:14px; color:var(--text-muted); margin-bottom:10px;">Stock actuel: <b style="color:var(--text); font-size:16px;" id="stock-current-val-${p.id}">${stockVal}</b></div>
                                            
                                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                                                <button type="button" class="btn btn-sm" onclick="adjustStockInputValue('${p.id}', -1)" style="width:36px; height:36px; font-size:18px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:rgba(255,255,255,0.05);">-</button>
                                                <input type="number" id="stock-input-${p.id}" value="${stockVal}" min="0" style="width:80px; height:36px; text-align:center; font-size:16px; font-weight:700; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2);">
                                                <button type="button" class="btn btn-sm" onclick="adjustStockInputValue('${p.id}', 1)" style="width:36px; height:36px; font-size:18px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:rgba(255,255,255,0.05);">+</button>
                                            </div>
                                            
                                            <div style="margin-bottom:15px;">${statusLabel}</div>
                                            
                                            <button type="button" class="btn btn-accent" id="btn-save-stock-${p.id}" onclick="saveProductStock('${p.id}')" style="width:100%; padding:10px; font-weight:bold; border-radius:8px;">Sauvegarder</button>
                                        </div>
                                    `;
                                }).join('');
                            }
                        }

                        const listContainer = document.getElementById('product-cards-list');
                        if (listContainer && window._productTab !== 'stock') {
                            listContainer.innerHTML = filtered.length === 0
                                ? '<div style="text-align:center; padding:40px 20px; opacity:0.5;"><div style="font-size:40px; margin-bottom:10px;">📦</div><p>Aucun produit correspondant.</p></div>'
                                : filtered.map((p, idx) => {
                                const realIdx = products.findIndex(x => x.id === p.id);
                                let mediaHtml = '';
                                let mediaCount = 0;
                                if (p.image_url && p.image_url.length > 5) {
                                    let firstUrl = p.image_url;
                                    try {
                                        if (p.image_url.startsWith('[') && p.image_url.endsWith(']')) {
                                            const arr = JSON.parse(p.image_url);
                                            if (arr.length > 0) {
                                                firstUrl = typeof arr[0] === 'string' ? arr[0] : arr[0].url;
                                                mediaCount = arr.length;
                                            }
                                        }
                                    } catch (e) { }

                                    const isVideo = firstUrl.match(/\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i);
                                    if (isVideo) {
                                        mediaHtml = `<video src="${firstUrl}" style="width:100%;height:100%;object-fit:cover;" muted></video>`;
                                    } else {
                                        mediaHtml = `<img src="${firstUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                                    }
                                } else {
                                    mediaHtml = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:28px;">📦</div>';
                                }

                                const isAvailable = (p.is_active !== undefined) ? p.is_active : p.is_available;
                                return `
                                <div class="product-card ${!isAvailable ? 'product-hidden' : ''}" data-id="${p.id}" onclick="editProdByIndex(${realIdx})" style="cursor:pointer; position:relative;">
                                    <div class="drag-handle" onclick="event.stopPropagation();">≡</div>
                                    <div class="product-card-media" style="position:relative;">
                                        ${mediaHtml}${mediaCount > 1 ? `<span style="position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.6); color:white; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:700; z-index:2;">+${mediaCount - 1}</span>` : ''}
                                        ${!isAvailable ? '<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:800; border-radius:12px 12px 0 0;">MASQUÉ</div>' : ''}
                                    </div>
                                    <div class="product-card-info">
                                        <div style="display:flex; justify-content:space-between; align-items:start; gap:5px;">
                                            <div class="product-card-name">${p.name}</div>
                                            ${p.supplier_id ? '<span style="background:rgba(106,90,205,0.15); color:#6a5acd; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:700;">PROPOSITION</span>' : ''}
                                        </div>
                                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:2px 0;">
                                            <span style="font-weight:800; color:var(--accent); font-size:15px;">${p.price}€</span>
                                        </div>
                                        <div class="product-card-desc" style="font-size:11px; opacity:0.5; margin-top:2px;">${p.description || ''}</div>
                                    </div>
                                    <div class="product-card-actions" onclick="event.stopPropagation();" style="display:flex; gap:5px;">
                                        <button class="btn btn-outline btn-sm" onclick="editProdByIndex(${realIdx})" style="font-size:11px; padding:4px 10px; flex:1;">Modifier</button>
                                        <button class="btn btn-sm" onclick="delProd('${p.id}')" style="font-size:11px; padding:4px 10px; color:var(--danger); border:1px solid rgba(255,50,50,0.2);">🗑</button>
                                    </div>
                                </div>
                            `;
                            }).join('');

                            if (window._productSortable) window._productSortable.destroy();
                            window._productSortable = new Sortable(listContainer, {
                                handle: '.drag-handle', animation: 150, ghostClass: 'sortable-ghost',
                                onEnd: async (evt) => {
                                    const ids = Array.from(listContainer.querySelectorAll('.product-card')).map(el => el.dataset.id);
                                    await reorderProducts(ids);
                                }
                            });
                        }
                    } catch (err) {
                        console.error('[Products] Error:', err);
                        showToast(t('dom_impossible_de_charge', "Impossible de charger les produits."), 'error');
                    }
                }

                if (id === 'orders') {
                    try {
                        const timeframe = window._orderTimeframe || 'all';
                        const [orders, livreurs] = await Promise.all([
                            api(`/orders?limit=200&timeframe=${timeframe}`, 'GET', null, silent),
                            api('/livreurs', 'GET', null, silent)
                        ]);
                        window._cachedOrders = orders;
                        window._cachedLivreurs = livreurs;
                        filterData('orders', timeframe);
                    } catch (e) {
                        console.error("Orders load failed", e);
                        document.querySelector('#orderTable tbody').innerHTML = '<tr><td colspan="11" style="padding:20px; color:var(--danger)">Erreur de chargement des commandes.</td></tr>';
                    }
                }
                if (id === 'livreurs') {
                    try {
                        let livreurs = await api('/livreurs', 'GET', null, silent);
                        const onlyOnline = document.getElementById('online-livreurs-only').checked;
                        if (onlyOnline) {
                            livreurs = livreurs.filter(l => l.is_available);
                        }
                        renderLivreursTable(livreurs);
                    } catch (e) {
                        document.getElementById('livreursTable').innerHTML = '<tr><td colspan="4" style="color:var(--danger);padding:20px">Erreur de chargement.</td></tr>';
                    }
                }
                if (id === 'broadcast') {
                    try {
                        const history = await api('/broadcasts', 'GET', null, silent);
                        history.forEach(h => {
                            h.media_urls = [];
                            if (h.message && h.message.includes("|||MEDIA_URLS|||")) {
                                const parts = h.message.split("|||MEDIA_URLS|||");
                                h.message = parts[0];
                                try {
                                    const parsed = JSON.parse(parts[1]);
                                    h.media_urls = Array.isArray(parsed) ? parsed.map(url => ({ url, type: url.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'photo' })) : [];
                                } catch (e) { }
                            }
                        });
                        window._lastBroadcasts = history;

                        const historyTbody = document.querySelector('#bcHistoryTable tbody');
                        if (historyTbody) {
                            if (!history || history.length === 0) {
                                historyTbody.innerHTML = '<tr><td colspan="7" style="padding:40px; text-align:center; color:var(--text-muted)">Aucune diffusion enregistrée.</td></tr>';
                                return;
                            }
                            historyTbody.innerHTML = history.map(h => {
                                try {
                                    const d = safeDate(h.created_at);
                                    const dateStr = !isNaN(d.getTime()) ? d.toLocaleString('fr-FR') : '—';
                                    let pollHtml = '';
                                    if (h.poll_data && h.poll_data.options) {
                                        const p = h.poll_data;
                                        const totalVotes = Object.keys(p.votes || {}).length;

                                        pollHtml = `<div style="background:rgba(255,165,0,0.05); padding:8px; border-radius:6px; margin-top:8px; border:1px solid rgba(255,165,0,0.1);">
                                            <div style="font-weight:bold; color:#ffa500; font-size:11px; margin-bottom:5px;">📊 RÉSULTATS DU SONDAGE</div>`;

                                        p.options.forEach((opt, idx) => {
                                            const voters = Object.entries(p.votes || {})
                                                .filter(([uid, v]) => v && v.option == idx)
                                                .map(([uid, v]) => v.userName || 'Inconnu');
                                            const count = voters.length;
                                            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                            pollHtml += `<div style="font-size:11px; margin-bottom:4px;">
                                                <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                                                    <span>${opt}</span>
                                                    <b>${count} (${percent}%)</b>
                                                </div>
                                                <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;">
                                                    <div style="width:${percent}%; height:100%; background:#ffa500;"></div>
                                                </div>
                                                ${voters.length > 0 ? `<div style="font-size:9px; color:rgba(255,255,255,0.5); margin-top:2px;">👥 ${voters.join(', ')}</div>` : ''}
                                            </div>`;
                                        });

                                        if (p.poll_allow_free) {
                                            const freeResp = Object.values(p.free_responses || {});
                                            pollHtml += `<div style="margin-top:8px; border-top:1px solid rgba(255,165,0,0.1); padding-top:5px;">
                                                <div style="font-weight:bold; color:#ffa500; font-size:11px;">🖊 RÉPONSES LIBRES (${freeResp.length})</div>`;
                                            freeResp.forEach(fr => {
                                                pollHtml += `<div style="font-size:10px; margin-top:4px; font-style:italic;">
                                                    <b>${fr.userName || 'Utilisateur'} :</b> "${fr.text}"
                                                </div>`;
                                            });
                                            pollHtml += `</div>`;
                                        }
                                        pollHtml += `</div>`;
                                    }

                                    let endDateStr = '';
                                    if (h.end_at) {
                                        const ed = new Date(h.end_at);
                                        if (!isNaN(ed.getTime())) {
                                            endDateStr = ed.toLocaleDateString('fr-FR');
                                        }
                                    }

                                    return `
                                    <tr>
                                        <td data-label="Date">
                                            <small>${dateStr}</small>
                                            ${h.badge ? `<br><span class="badge" style="background:var(--accent); color:white; padding:2px 6px; border-radius:4px; font-size:10px;">${h.badge.toUpperCase()}</span>` : ''}
                                        </td>
                                        <td data-label="Média">${h.media_urls && h.media_urls.length > 0 ? `<div style="color:var(--accent); font-size:12px; font-weight:bold;">📁 ${h.media_urls.length} média(s)</div>` : '—'}</td>
                                        <td data-label="Message">
                                            <div style="font-size:13px; max-width:400px; line-height:1.5; white-space:pre-wrap; word-break:break-word; max-height:150px; overflow-y:auto; padding-right:5px;">
                                                ${h.message || '<i style="opacity:0.6">(Média uniquement)</i>'}
                                                ${endDateStr ? `<br><small style="opacity:0.6">⏳ Jusqu'au ${endDateStr}</small>` : ''}
                                                ${pollHtml}
                                            </div>
                                        </td>
                                        <td data-label="Cibles"><b>${h.total_target || 0}</b></td>
                                        <td data-label=t("success")><span style="color:#4caf50; font-weight:bold">${h.success || 0}</span></td>
                                        <td data-label="Bloqués">
                                            <span style="color:#ff453a; font-weight:bold; cursor:pointer"
                                                  title="Nouveaux: ${h.blocked - (h.previously_blocked || 0)}, Anciens: ${h.previously_blocked || 0}. Noms: ${h.blocked_names || 'Aucun'}">
                                                ${(parseInt(h.blocked) || 0) + (parseInt(h.failed) || 0)} ⚠️
                                            </span>
                                        </td>
                                        <td data-label="Actions" class="action-btns">
                                            <button class="btn btn-outline btn-sm" onclick="republishBC('${h.id}')" title="Republier">🔄</button>
                                            <button class="btn btn-outline btn-sm text-danger" onclick="deleteBC('${h.id}')" title="Supprimer">🗑️</button>
                                        </td>
                                    </tr>
                                    `;
                                } catch (err) {
                                    console.error("Row render failed", err, h);
                                    return '<tr><td colspan="7">Erreur affichage ligne</td></tr>';
                                }
                            }).join('');
                        }
                    } catch (e) {
                        console.error("BC load error", e);
                        const historyTbody = document.querySelector('#bcHistoryTable tbody');
                        if (historyTbody) historyTbody.innerHTML = '<tr><td colspan="7" style="color:var(--danger);padding:20px">Erreur de chargement.</td></tr>';
                    }
                }

                if (id === 'support-chat') {
                    try {
                        const chats = await api('/admin-chat/all', 'GET', null, silent);
                        window._adminChatsData = chats;
                        filterAdminChats();
                    } catch (e) {
                        console.error("Support Chat load error", e);
                        document.getElementById('admin-chat-list').innerHTML = '<div style="color:var(--danger);padding:20px;text-align:center;">Erreur de chargement des conversations.</div>';
                    }
                }

                if (id === 'reviews') {
                    try {
                        const reviews = await api('/reviews', 'GET', null, silent);
                        renderReviewsTable(reviews);
                    } catch (e) {
                        console.error('Reviews load error:', e);
                        document.getElementById('reviews-tbody').innerHTML = '<tr><td colspan="6" style="color:var(--danger);padding:20px">Erreur de chargement des avis.</td></tr>';
                    }
                }
                if (id === 'suppliers') {
                    try {
                        await loadSuppliers();
                    } catch (e) {
                        console.error('Suppliers load error:', e);
                        document.getElementById('suppliersList').innerHTML = '<p style="color:var(--danger);padding:20px">Erreur de chargement des fournisseurs.</p>';
                    }
                }
                if (id === 'insights') {
                    const data = await api('/analytics', 'GET', null, silent);
                    window.lastAnalytics = data;
                    window.currentAnalyticsRaw = data.rawDelivered || [];

                    if (document.getElementById('avg-delivery-time')) document.getElementById('avg-delivery-time').innerText = (data.avgDeliveryTime || 0) + ' min';
                    if (document.getElementById('insights-total-orders')) document.getElementById('insights-total-orders').innerText = data.totalOrders || 0;
                    if (document.getElementById('insights-total-cities')) document.getElementById('insights-total-cities').innerText = Object.keys(data.byCity || {}).length;

                    // --- City chart (byCity is now {ca,count}) ---
                    if (chartInstances.cities) chartInstances.cities.destroy();
                    const cityEntries = Object.entries(data.byCity || {})
                        .map(([k,v]) => [k, typeof v === 'object' ? v.ca : v])
                        .sort((a, b) => b[1] - a[1]).slice(0, 8);
                    chartInstances.cities = new Chart(document.getElementById('canvas-cities'), {
                        type: 'doughnut',
                        data: {
                            labels: cityEntries.map(e => e[0]),
                            datasets: [{ data: cityEntries.map(e => parseFloat(e[1].toFixed(2))),
                                backgroundColor: ['#ff0050','#0095f6','#f09433','#cc2366','#00f0ff','#a855f7','#22d3ee','#f43f5e'],
                                borderWidth: 0 }]
                        },
                        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#fff', boxWidth: 10, font: { size: 10 } } } } }
                    });

                    // Platform Chart removed (Telegram only)

                    renderMainChart(window.currentTimeframe || 'hour');

                    // --- Districts Ranking ---
                    const topDistricts = Object.entries(data.byDistrict || {})
                        .sort((a,b) => b[1].ca - a[1].ca)
                        .slice(0, 10);
                    
                    const districtsHtml = topDistricts.map(([name, val]) => `
                        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); align-items:center;">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-size:13px; font-weight:600;">${name}</span>
                                <span style="font-size:10px; opacity:0.5;">${val.city || ''}</span>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:700; color:#00f0ff; font-size:13px;">${val.ca.toFixed(2)}€</div>
                                <div style="font-size:10px; opacity:0.6;">${val.count} cmd.</div>
                            </div>
                        </div>
                    `).join('');
                    if (document.getElementById('list-top-districts')) {
                        document.getElementById('list-top-districts').innerHTML = districtsHtml || '<div style="padding:10px;opacity:0.5;">—</div>';
                    }

                    // Top Arr. (75) summary card
                    const parisDistricts = topDistricts.filter(([name]) => name.toUpperCase().startsWith('PARIS') || name.startsWith('75') || name.startsWith('750'));
                    if (parisDistricts.length > 0 && document.getElementById('stat-top-arr')) {
                        document.getElementById('stat-top-arr').innerText = parisDistricts[0][0].replace('Paris ', '');
                    } else if (topDistricts.length > 0 && document.getElementById('stat-top-arr')) {
                        document.getElementById('stat-top-arr').innerText = topDistricts[0][0];
                    } else if (document.getElementById('stat-top-arr')) {
                        document.getElementById('stat-top-arr').innerText = '—';
                    }

                    // Leaderboards
                    const topProds = Object.entries(data.byProduct || {}).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);
                    document.getElementById('list-top-products').innerHTML = topProds.map(e => `
                        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span style="font-size:13px;">${e[0]}</span>
                            <span style="font-weight:700; color:var(--accent);">${e[1].qty} ventes</span>
                        </div>
                    `).join('') || '<div style="padding:10px;opacity:0.5;">—</div>';

                    const topDrivers = Object.entries(data.byDriver || {}).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
                    document.getElementById('list-top-drivers').innerHTML = topDrivers.map(e => `
                        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span style="font-size:13px;">${e[0]}</span>
                            <span style="font-weight:700; color:var(--success);">${e[1].count} liv.</span>
                        </div>
                    `).join('') || '<div style="padding:10px;opacity:0.5;">—</div>';

                    const topUsers = Object.entries(data.byUser || {}).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
                    document.getElementById('list-top-users').innerHTML = topUsers.map(e => `
                        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span style="font-size:13px;">${e[0]}</span>
                            <span style="font-weight:700; color:var(--accent);">${e[1].count} cmd.</span>
                        </div>
                    `).join('') || '<div style="padding:10px;opacity:0.5;">—</div>';

                    // --- GEO TABLE (with drill-down) ---
                    const cityTable = data.cityTable || [];
                    const totalCA = data.totalCA || 0;
                    const cityTbody = document.getElementById('city-analytics-table');
                    if (cityTbody) {
                        document.getElementById('city-table-total').textContent = `${cityTable.length} zones · ${(parseFloat(totalCA) || 0).toFixed(2)}€ CA total`;
                        cityTbody.innerHTML = cityTable.length === 0
                            ? '<tr><td colspan="6" style="text-align:center;padding:30px;opacity:0.5;">Aucune donnée géographique disponible.</td></tr>'
                            : cityTable.map((row, i) => {
                                const share = totalCA > 0 ? ((row.ca / totalCA) * 100).toFixed(1) : 0;
                                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                                const topProdsHtml = (row.topProducts || []).map((p, pi) =>
                                    `<span style="font-size:10px;padding:2px 5px;margin-right:3px;border-radius:4px;background:rgba(255,0,80,0.12);color:var(--accent);">${p.name} (×${p.qty})</span>`
                                ).join('');
                                const hasDistricts = row.districts && row.districts.length > 0;
                                const rowId = `dist-${i}`;
                                const districtRows = hasDistricts ? row.districts.map(d => `
                                    <tr class="district-row" id="${rowId}" style="display:none; background:rgba(255,255,255,0.02);">
                                        <td style="padding-left:32px; font-size:11px; color:var(--text-muted);">↳ ${d.district}</td>
                                        <td style="text-align:right; font-size:11px; color:var(--accent);">${(parseFloat(d.ca) || 0).toFixed(2)}€</td>
                                        <td style="text-align:right; font-size:11px;">${d.count}</td>
                                        <td style="text-align:right; font-size:11px; color:var(--text-muted);">—</td>
                                        <td style="font-size:10px; color:var(--text-muted);">${d.topProduct}</td>
                                        <td style="text-align:right; font-size:11px; color:orange;">${d.priority > 0 ? '⚡ '+d.priority : '—'}</td>
                                    </tr>`).join('') : '';
                                return `<tr onclick="toggleDistricts('${rowId}')" style="cursor:${hasDistricts?'pointer':'default'}">
                                    <td><b>${medal} ${row.city}</b> <span style="font-size:10px;opacity:0.4;">${share}%</span>${hasDistricts ? ' <span style="font-size:10px;color:var(--text-muted);">▶</span>' : ''}<br><span style="font-size:11px;display:block;margin-top:3px;">${topProdsHtml}</span></td>
                                    <td style="text-align:right; font-weight:700; color:var(--accent);">${(parseFloat(row.ca) || 0).toFixed(2)}€</td>
                                    <td style="text-align:right;">${row.count}</td>
                                    <td style="text-align:right; color:var(--text-muted);">${(parseFloat(row.avgBasket) || 0).toFixed(2)}€</td>
                                    <td style="font-size:12px; max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${row.topProduct}</td>
                                    <td style="text-align:right; color:orange;">${row.priorityCount > 0 ? '⚡ ' + row.priorityCount : '—'}</td>
                                </tr>${districtRows}`;
                            }).join('');
                    }

                    // --- PRIORITY STATS ---
                    const priority = data.priority || { total: 0, byHour: {}, byCity: {}, byProduct: {}, avgHour: 'N/A' };
                    const priorityTotalEl = document.getElementById('priority-total');
                    if (priorityTotalEl) priorityTotalEl.textContent = priority.total || 0;

                    // Priority peak hour badge
                    const peakHourEl = document.getElementById('priority-peak-hour');
                    if (peakHourEl) peakHourEl.textContent = priority.avgHour !== 'N/A' ? `⏰ Pic : ${priority.avgHour}` : '';

                    // Priority by product
                    const priorityProdList = document.getElementById('priority-product-list');
                    if (priorityProdList) {
                        const ppEntries = Object.entries(priority.byProduct || {}).sort((a,b) => b[1]-a[1]).slice(0, 8);
                        const maxPP = ppEntries[0]?.[1] || 1;
                        priorityProdList.innerHTML = ppEntries.length === 0
                            ? '<div style="padding:10px;opacity:0.5;">—</div>'
                            : ppEntries.map(([prod, count]) => `
                                <div style="margin-bottom:8px;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                                        <span style="font-size:12px;">${prod}</span>
                                        <span style="font-weight:700; color:orange;">⚡ ${count}</span>
                                    </div>
                                    <div style="background:rgba(255,255,255,0.06); border-radius:4px; height:4px;">
                                        <div style="background:orange; height:100%; width:${Math.round((count/maxPP)*100)}%; border-radius:4px;"></div>
                                    </div>
                                </div>
                            `).join('');
                    }

                    // Priority hourly chart
                    const phCanvas = document.getElementById('canvas-priority-hour');
                    if (phCanvas) {
                        if (chartInstances.priorityHour) chartInstances.priorityHour.destroy();
                        const phEntries = Object.entries(priority.byHour || {}).sort((a,b) => {
                            const ha = parseInt(a[0]), hb = parseInt(b[0]);
                            return ha - hb;
                        });
                        chartInstances.priorityHour = new Chart(phCanvas, {
                            type: 'bar',
                            data: {
                                labels: phEntries.map(e => e[0]),
                                datasets: [{ label: 'Prioritaires', data: phEntries.map(e => e[1]),
                                    backgroundColor: phEntries.map((e, idx) => {
                                        const maxV = Math.max(...phEntries.map(x => x[1]));
                                        return e[1] === maxV ? 'rgba(255,165,0,0.95)' : 'rgba(255,165,0,0.45)';
                                    }),
                                    borderColor: 'orange', borderWidth: 1, borderRadius: 6 }]
                            },
                            options: { maintainAspectRatio: false,
                                scales: { y: { beginAtZero: true, grid: { color: '#262626' }, ticks: { color: '#a8a8a8', stepSize: 1 } },
                                    x: { grid: { display: false }, ticks: { color: '#a8a8a8' } } },
                                plugins: { legend: { display: false },
                                    tooltip: { callbacks: { label: ctx => `${ctx.raw} commande(s) prioritaire${ctx.raw>1?'s':''}` } } }
                            }
                        });
                    }

                    // Priority city list
                    const priorityCityList = document.getElementById('priority-city-list');
                    if (priorityCityList) {
                        const pcEntries = Object.entries(priority.byCity || {}).sort((a,b) => b[1]-a[1]).slice(0, 10);
                        const maxPc = pcEntries[0]?.[1] || 1;
                        priorityCityList.innerHTML = pcEntries.length === 0
                            ? '<div style="padding:10px;opacity:0.5;">Aucune commande prioritaire enregistrée.</div>'
                            : pcEntries.map(([city, count]) => `
                                <div style="margin-bottom:10px;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                        <span style="font-size:13px; font-weight:600;">📍 ${city}</span>
                                        <span style="font-weight:700; color:orange;">⚡ ${count}</span>
                                    </div>
                                    <div style="background:rgba(255,255,255,0.06); border-radius:4px; height:6px; overflow:hidden;">
                                        <div style="background:orange; height:100%; width:${Math.round((count/maxPc)*100)}%; border-radius:4px;"></div>
                                    </div>
                                </div>
                            `).join('');
                    }

                    // --- FUNNEL ---
                    const funnel = data.funnel || {};
                    const funnelEl = document.getElementById('funnel-stats');
                    if (funnelEl) {
                        funnelEl.innerHTML = `
                            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:12px; margin-top:8px;">
                                <div style="text-align:center; padding:14px; background:rgba(255,255,255,0.04); border-radius:10px;">
                                    <div style="font-size:22px; font-weight:800; color:#7c83fd;">${funnel.catalogViews || 0}</div>
                                    <div style="font-size:10px; opacity:0.6; margin-top:4px;">Commandes initiées</div>
                                </div>
                                <div style="text-align:center; padding:14px; background:rgba(255,255,255,0.04); border-radius:10px;">
                                    <div style="font-size:22px; font-weight:800; color:#4ecdc4;">${funnel.cartAdds || 0}</div>
                                    <div style="font-size:10px; opacity:0.6; margin-top:4px;">Ajouts panier</div>
                                </div>
                                <div style="text-align:center; padding:14px; background:rgba(255,255,255,0.04); border-radius:10px;">
                                    <div style="font-size:22px; font-weight:800; color:#f7dc6f;">${funnel.checkouts || 0}</div>
                                    <div style="font-size:10px; opacity:0.6; margin-top:4px;">Checkout</div>
                                </div>
                                <div style="text-align:center; padding:14px; background:rgba(255,255,255,0.04); border-radius:10px;">
                                    <div style="font-size:22px; font-weight:800; color:var(--success);">${funnel.completed || 0}</div>
                                    <div style="font-size:10px; opacity:0.6; margin-top:4px;">Livrées</div>
                                </div>
                                <div style="text-align:center; padding:14px; background:rgba(255,255,255,0.04); border-radius:10px;">
                                    <div style="font-size:22px; font-weight:800; color:var(--danger);">${funnel.cancelled || 0}</div>
                                    <div style="font-size:10px; opacity:0.6; margin-top:4px;">Annulées</div>
                                </div>
                                <div style="text-align:center; padding:14px; background:rgba(255,0,80,0.08); border-radius:10px; border:1px solid rgba(255,0,80,0.2);">
                                    <div style="font-size:22px; font-weight:800; color:var(--accent);">${funnel.abandonRate || 0}%</div>
                                    <div style="font-size:10px; opacity:0.6; margin-top:4px;">Taux d'abandon</div>
                                </div>
                            </div>`;
                    }


                    // --- RAW DELIVERIES TABLE ---
                    const rawTbody = document.getElementById('raw-deliveries-table');
                    if (rawTbody) {
                        const raw = (data.rawDelivered || []).slice(0, 200);
                        rawTbody.innerHTML = raw.length === 0
                            ? '<tr><td colspan="10" style="text-align:center;padding:20px;opacity:0.5;">Aucune livraison.</td></tr>'
                            : raw.map(r => `<tr>
                                <td style="white-space:nowrap; font-size:11px;">${r.date}</td>
                                <td>${r.client}</td>
                                <td style="max-width:120px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.product || '—'}</td>
                                <td style="color:var(--text-muted); font-size:11px;">${r.city || '?'}${r.district && r.district !== r.city ? `<br><span style="opacity:0.5;font-size:10px;">↳ ${r.district}</span>` : ''}</td>
                                <td style="text-align:right; font-weight:700; color:var(--accent);">${(parseFloat(r.price) || 0).toFixed(2)}€</td>
                                <td style="text-align:center;">${r.delivery_time ? r.delivery_time + 'min' : '—'}</td>
                                <td>${r.livreur}</td>
                                <td><span style="font-size:10px; padding:2px 6px; border-radius:10px; background:rgba(0,136,204,0.15); color:#0088cc;">${r.platform}</span></td>
                                <td style="text-align:center;">${r.is_priority ? '<span style="color:orange; font-size:14px;">⚡</span>' : ''}</td>
                                <td>${r.chat_count > 0 ? `<button class="btn btn-sm btn-outline" style="font-size:10px; padding:2px 5px; height:auto; min-height:0;" onclick="contactUser(null, null, null, null, '${r.user_id}')">💬 (${r.chat_count})</button>` : ''}</td>
                            </tr>`).join('');
                    }

                    // --- LIVE STOCKS ---
                    try {
                        const products = await api('/products', 'GET', null, true);
                        let totalValue = 0;
                        let outCount = 0;
                        let lowCount = 0;
                        let totalQty = 0;

                        const stockRows = products.map(p => {
                            const stock = typeof p.stock === 'number' ? p.stock : 0;
                            const price = parseFloat(p.price) || 0;
                            totalValue += price * stock;
                            totalQty += stock;

                            let statusBadge = '';
                            let progressColor = 'var(--success)';
                            if (stock <= 0) {
                                outCount++;
                                statusBadge = '<span style="background:rgba(255,59,48,0.15); color:#ff3b30; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">RUPTURE</span>';
                                progressColor = '#ff3b30';
                            } else if (stock <= 5) {
                                lowCount++;
                                statusBadge = '<span style="background:rgba(255,149,0,0.15); color:#ff9500; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">FAIBLE</span>';
                                progressColor = '#ff9500';
                            } else {
                                statusBadge = '<span style="background:rgba(52,199,89,0.15); color:#34c759; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">CORRECT</span>';
                                progressColor = '#34c759';
                            }

                            const percent = Math.min(100, Math.max(0, (stock / 30) * 100));

                            return {
                                name: p.name || 'Inconnu',
                                category: p.category || 'N/A',
                                price: price.toFixed(2) + '€',
                                stock,
                                statusBadge,
                                progressHtml: `
                                    <div style="width:100px; height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; margin:0 auto;">
                                        <div style="width:${percent}%; height:100%; background:${progressColor}; border-radius:4px;"></div>
                                    </div>
                                `
                            };
                        });

                        const stockValEl = document.getElementById('stock-total-value');
                        if (stockValEl) stockValEl.innerText = totalValue.toFixed(2) + '€';
                        const stockOutEl = document.getElementById('stock-out-count');
                        if (stockOutEl) stockOutEl.innerText = outCount;
                        const stockLowEl = document.getElementById('stock-low-count');
                        if (stockLowEl) stockLowEl.innerText = lowCount;
                        const stockQtyEl = document.getElementById('stock-total-qty');
                        if (stockQtyEl) stockQtyEl.innerText = totalQty;

                        // Update Insights stock cards
                        const isv = document.getElementById('insights-stock-value');
                        if (isv) isv.innerText = totalValue.toFixed(2) + '€';
                        const iso = document.getElementById('insights-stock-out');
                        if (iso) iso.innerText = outCount;
                        const isq = document.getElementById('insights-stock-qty');
                        if (isq) isq.innerText = totalQty;

                        window.stockData = stockRows;
                        renderStockTable(stockRows);
                    } catch(e) {
                        console.error('Stock load error:', e);
                    }
                }
                if (id === 'settings') {
                    const s = await api('/settings');
                    window.appSettings = s; // Mise à jour globale
                    const setVal = (id, val) => {
                        const el = document.getElementById(id);
                        if (el) {
                            if (el.type === 'checkbox') el.checked = !!val;
                            else el.value = val === undefined || val === null ? '' : val;
                        }
                    };
                    
                    // Payment Modes Initialization
                    const pmContainer = document.getElementById('payment_modes_container');
                    if (pmContainer) {
                        pmContainer.innerHTML = '';
                        let pModes = [];
                        try {
                            pModes = typeof s.payment_modes_config === 'string' ? JSON.parse(s.payment_modes_config) : (s.payment_modes_config || []);
                        } catch(e) { console.error('Parse PM config failed', e); }
                        if (!pModes || pModes.length === 0) {
                            addPaymentModeRow({id:'CASH', label:'Espèces', icon:'💵'});
                        } else {
                            pModes.forEach(m => addPaymentModeRow(m));
                        }
                    }

                    setVal('set_bot_name', s.bot_name);
                    setVal('set_title', s.dashboard_title || 'Admin Panel');
                    setVal('set_bot_description', s.bot_description || '');
                    setVal('set_bot_short_description', s.bot_short_description || '');
                    setVal('set_color', s.accent_color || '#ff0050');

                    // Admin Dynamic List
                    const container = document.getElementById('admins_list_container');
                    if (container) {
                        container.innerHTML = '';
                        const adminIds = String(s.admin_telegram_id || '')
                            .replace(/[\[\]"]/g, '') // Remove brackets and quotes if stored as JSON string
                            .split(/[\s,]+/)
                            .filter(id => id.trim() !== '');
                        if (adminIds.length === 0) {
                            addAdminRow('');
                        } else {
                            adminIds.forEach(id => addAdminRow(id));
                        }
                    }
                    setVal('set_current_password', s.admin_password || '');
                    setVal('set_dashboard_url', s.dashboard_url || '');
                    setVal('set_private_contact_url', s.private_contact_url || '');
                    setVal('set_private_contact_wa_url', s.private_contact_wa_url || '');
                    setVal('set_channel_url', s.channel_url || '');

                    renderCustomLinks(s.custom_links);

                    // Plateformes
                    setVal('set_enable_telegram', s.enable_telegram);
                    setVal('set_enable_marketplace', s.enable_marketplace);
                    setVal('set_enable_fidelity', s.enable_fidelity);
                    setVal('set_enable_referral', s.enable_referral);
                    setVal('set_enable_help_menu', s.enable_help_menu);
                    setVal('set_welcome_message_enabled', s.welcome_message_enabled);
                    setVal('set_enable_itinerary_btn', s.enable_itinerary_btn);

                    setVal('set_pts_ratio', s.points_ratio || 1);
                    setVal('set_pts_exchange', s.points_exchange || 100);
                    setVal('set_pts_credit_value', s.points_credit_value || 5);
                    setVal('set_ref_bonus', s.ref_bonus || 5);
                    setVal('set_fidelity_thresholds', s.fidelity_bonus_thresholds || '5,10');
                    renderPaliersGrid(s.fidelity_bonus_thresholds || '5,10');
                    setVal('set_fidelity_bonus_val', s.fidelity_bonus_amount || 10);
                    setVal('set_fidelity_min_spend', s.fidelity_min_spend || 50);

                    // Composants UI
                    setVal('set_ui_icon_catalog', s.ui_icon_catalog || '🍔');
                    setVal('set_label_catalog', s.label_catalog || 'Catalogue Produits');
                    setVal('set_ui_icon_orders', s.ui_icon_orders || '📦');
                    setVal('set_label_my_orders', s.label_my_orders || 'Mes Commandes');
                    setVal('set_ui_icon_contact', s.ui_icon_contact || '📱');
                    setVal('set_label_contact', s.label_contact || 'Mon contact privé');
                    setVal('set_ui_icon_profile', s.ui_icon_profile || '🎁');
                    setVal('set_label_profile', s.label_profile || 'Mon Profil & Parrainage');
                    setVal('set_ui_icon_livreur', s.ui_icon_livreur || '🛵');
                    setVal('set_label_livreur', s.label_livreur_space || 'Espace Livreur');
                    setVal('set_ui_icon_admin', s.ui_icon_admin || '⚙️');
                    setVal('set_label_admin_bot', s.label_admin_bot || 'Gestion Bot');
                    setVal('set_ui_icon_web', s.ui_icon_web || '🌐');
                    setVal('set_label_admin_web', s.label_admin_web || 'Dashboard Web');
                    setVal('set_ui_icon_wallet', s.ui_icon_wallet || '💳');
                    setVal('set_ui_icon_points', s.ui_icon_points || '⭐️');
                    setVal('set_ui_icon_channel', s.ui_icon_channel || '📢');
                    setVal('set_label_channel', s.label_channel || 'Lien Canal Telegram');
                    setVal('set_ui_icon_info', s.ui_icon_info || 'ℹ️');
                    setVal('set_label_info', s.label_info || 'Informations');
                    setVal('set_ui_icon_support', s.ui_icon_support || '❓');
                    setVal('set_label_support', s.label_support || 'Aide & Support');
                    setVal('set_ui_icon_leave_review', s.ui_icon_leave_review || '⭐️');
                    setVal('set_label_leave_review', s.label_leave_review || 'Laisser un avis / Commentaire');
                    setVal('set_ui_icon_view_reviews', s.ui_icon_view_reviews || '👥');
                    setVal('set_label_view_reviews', s.label_view_reviews || 'Consulter les avis');
                    setVal('set_ui_icon_welcome', s.ui_icon_welcome || '🏠');
                    setVal('set_label_welcome', s.label_welcome || 'Message d\'accueil');

                    if (s.mini_app_logo) {
                        const img = document.getElementById('dashboard_logo_preview');
                        if (img) img.src = s.mini_app_logo;
                    }

                    // --- ALL FIELDS (SAFENED TO PREVENT CRASHES) ---
                    setVal('set_status_pending_label', s.status_pending_label);
                    setVal('set_ui_icon_pending', s.ui_icon_pending);
                    setVal('set_status_confirmed_label', s.status_confirmed_label);
                    setVal('set_ui_icon_confirmed', s.ui_icon_confirmed);
                    setVal('set_status_preparing_label', s.status_preparing_label);
                    setVal('set_ui_icon_preparing', s.ui_icon_preparing);
                    setVal('set_status_taken_label', s.status_taken_label);
                    setVal('set_ui_icon_taken', s.ui_icon_taken);
                    setVal('set_status_delivered_label', s.status_delivered_label);
                    setVal('set_ui_icon_success', s.ui_icon_success);
                    setVal('set_status_cancelled_label', s.status_cancelled_label);
                    setVal('set_ui_icon_error', s.ui_icon_error);

                    // Bot Content
                    setVal('set_msg_order_received_admin', s.msg_order_received_admin);
                    setVal('set_msg_order_confirmed_client', s.msg_order_confirmed_client);
                    setVal('set_btn_livreur_space', s.btn_livreur_space);
                    setVal('set_btn_back_menu', s.btn_back_menu);
                    setVal('set_msg_status_taken', s.msg_status_taken);
                    setVal('set_msg_status_delivered', s.msg_status_delivered);
                    setVal('set_msg_delay_report', s.msg_delay_report);
                    setVal('set_msg_arrival_soon', s.msg_arrival_soon);
                    setVal('set_msg_review_prompt', s.msg_review_prompt);
                    setVal('set_msg_review_thanks', s.msg_review_thanks);
                    setVal('set_btn_leave_review', s.btn_leave_review);
                    setVal('set_btn_view_reviews', s.btn_view_reviews);
                    setVal('set_btn_confirm_review', s.btn_confirm_review);
                    setVal('set_btn_back_menu_nav', s.btn_back_menu_nav);
                    setVal('set_btn_cart_resume', s.btn_cart_resume);
                    setVal('set_btn_client_mode', s.btn_client_mode);
                    setVal('set_msg_thanks_participation', s.msg_thanks_participation);
                    setVal('set_msg_your_answer', s.msg_your_answer);
                    setVal('set_label_reviews', s.label_reviews);
                    setVal('set_label_users', s.label_users);
                    setVal('set_default_wa_name', s.default_wa_name);

                    // Dynamically load others
                    const dynFields = [
                        'btn_back_generic', 'btn_back_quick_menu', 'btn_back_to_cart', 'btn_back_to_qty',
                        'btn_back_to_address', 'btn_back_to_options', 'btn_back_to_livreur_menu', 'btn_next', 'btn_previous',
                        'btn_clear_cart', 'btn_cancel_order', 'btn_cancel_my_order', 'btn_abandon_delivery',
                        'btn_send_now', 'btn_help_support', 'btn_where_is_delivery', 'btn_cancel', 'btn_cancel_alt',
                        'btn_dont_use_credit', 'btn_set_available', 'btn_notify_30min', 'btn_notify_10min',
                        'btn_rate_5', 'btn_rate_4', 'btn_rate_3', 'btn_rate_2', 'btn_rate_1',
                        'msg_session_expired', 'msg_product_not_found', 'msg_order_not_available', 'msg_order_not_found',
                        'msg_order_creation_error', 'msg_not_livreur', 'msg_access_denied',
                        'msg_catalog_empty', 'msg_cart_empty', 'msg_no_reviews_yet', 'msg_no_information',
                        'msg_no_active_deliveries', 'msg_empty_delivery_history', 'msg_no_active_orders',
                        'msg_cart_cleared', 'msg_thanks_for_feedback', 'msg_location_updated', 'msg_livreur_welcome',
                        'welcome_message', 'payment_modes', 'msg_choose_qty', 'msg_help_intro', 'show_broadcasts_btn',
                        'show_reviews_btn', 'enable_abandoned_cart_notifications', 'msg_abandoned_cart',
                        'force_subscribe', 'force_subscribe_channel_id', 'priority_delivery_enabled', 'priority_delivery_price',
                        'auto_approve_new', 'notify_on_approval'
                    ];
                    dynFields.forEach(key => setVal('set_' + key, s[key]));
                }
            } catch (err) {
                console.error('[LOAD DATA] Error:', err);
                showToast(err.message, 'error');
            } finally {
                if (section) {
                    section.classList.remove('loading');
                }
                document.body.classList.remove('loading');
                window._loadDataLock = false;
            }
        }

        /* FILE UPLOAD & DRAG & DROP */
        // ========== BROADCAST FILES (must be declared early) ==========
        let bcFiles = [];

        function addBcMedia(input) {
            const newFiles = Array.from(input.files);
            bcFiles = bcFiles.concat(newFiles);
            renderBcGrid();
            input.value = '';
        }

        let bcUrls = []; // For republished media

        function removeBcMedia(index, isUrl = false) {
            if (isUrl) bcUrls.splice(index, 1);
            else bcFiles.splice(index, 1);
            renderBcGrid();
        }

        function renderBcGrid() {
            const grid = document.getElementById('bc_media_grid');
            if (!grid) return;
            if (bcFiles.length === 0 && bcUrls.length === 0) { grid.innerHTML = ''; return; }

            let html = bcUrls.map((m, i) => `
                <div style="position:relative; aspect-ratio:1; border-radius:10px; overflow:hidden; border:1px solid var(--accent); background:rgba(255,0,80,0.05);">
                    ${m.type === 'video'
                    ? `<video src="${m.url}" style="width:100%;height:100%;object-fit:cover;" muted></video>`
                    : `<img src="${m.url}" style="width:100%;height:100%;object-fit:cover;">`}
                    <button onclick="removeBcMedia(${i}, true)" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                    <div style="position:absolute; bottom:0; width:100%; background:var(--accent); color:white; font-size:9px; text-align:center; padding:2px 0;">REPUBLIÉ</div>
                </div>
            `).join('');

            html += bcFiles.map((file, i) => {
                const url = URL.createObjectURL(file);
                const isVideo = file.type.startsWith('video');
                return `<div style="position:relative; aspect-ratio:1; border-radius:10px; overflow:hidden; border:1px solid var(--border);">
                    ${isVideo
                        ? `<video src="${url}" style="width:100%;height:100%;object-fit:cover;" muted></video>`
                        : `<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`}
                    <button onclick="removeBcMedia(${i}, false)" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>`;
            }).join('');

            grid.innerHTML = html;
        }

        async function addUserManually() {
            await showFormModal("Ajouter un Utilisateur", [
                { label: "ID Telegram (obligatoire)", id: "id", placeholder: "Ex: 12345678" },
                { label: "Prénom / Nom (facultatif)", id: "name", placeholder: "Ex: Jean Dupont" },
                { label: "Username Telegram (facultatif)", id: "user", placeholder: "Ex: username_sans_at" }
            ], async (vals) => {
                if (!vals.id) throw new Error("ID Telegram obligatoire");
                await api('/users/add', 'POST', {
                    telegram_id: vals.id,
                    first_name: vals.name || '',
                    username: vals.user || ''
                });
                showToast(t('dom_utilisateur_ajout_av', "Utilisateur ajouté avec succès !"));
                loadData('users');
                loadData('overview');
            });
        }

        async function republishBC(id) {
            if (!window._lastBroadcasts) return;
            const bc = window._lastBroadcasts.find(b => b.id === id);
            if (!bc) return;

            // Déterminer le type (si bc.poll_data existe, c'est un sondage)
            if (bc.poll_data) {
                document.getElementById('bcType').value = 'poll';
                document.getElementById('bcPollQuestion').value = bc.message.split('|||')[0] || '';
                const container = document.getElementById('poll_options_container');
                container.innerHTML = '';
                if (bc.poll_data.options) {
                    bc.poll_data.options.forEach((opt, idx) => {
                        const row = document.createElement('div');
                        row.className = 'poll-option-row';
                        row.style.display = 'flex';
                        row.style.gap = '10px';
                        row.innerHTML = `
                            <input type="text" class="bc-poll-opt-input" value="${opt}" placeholder="Option ${idx+1}" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border); background:var(--hover); color:var(--text-main);">
                            <button class="btn btn-sm btn-outline" onclick="this.parentElement.remove()" style="aspect-ratio:1; padding:0; width:40px; display:flex; align-items:center; justify-content:center;">✕</button>
                        `;
                        container.appendChild(row);
                    });
                }
                document.getElementById('bcPollFree').checked = bc.poll_data.poll_allow_free || false;
            } else {
                document.getElementById('bcType').value = 'simple';
                document.getElementById('bcMsg').value = (bc.message || '').split('|||')[0] || '';
            }

            toggleBcTypeFields();
            bcUrls = bc.media_urls || [];
            bcFiles = [];
            renderBcGrid();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showToast(t('dom_diffusion_charg_e_da', "Diffusion chargée dans l\'éditeur"), 'success');
        }

        async function deleteBC(id) {
            if (!await showModal('Suppression', 'Supprimer ce log de diffusion ?')) return;
            try {
                await api('/broadcasts/' + id, 'DELETE');
                showToast(t('dom_log_supprim', "Log supprimé"), 'success');
                loadData('broadcast');
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        function toggleBcTypeFields() {
            const type = document.getElementById('bcType').value;
            document.getElementById('bc-simple-msg-container').style.display = type === 'simple' ? 'block' : 'none';
            document.getElementById('bc-poll-ui').style.display = type === 'poll' ? 'block' : 'none';
        }



        function addPollOptionRow() {
            const container = document.getElementById('poll_options_container');
            const row = document.createElement('div');
            row.className = 'poll-option-row';
            row.style.display = 'flex';
            row.style.gap = '10px';
            const count = container.querySelectorAll('.poll-option-row').length + 1;
            row.innerHTML = `
                <input type="text" class="bc-poll-opt-input" placeholder="Option ${count}" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border); background:var(--hover); color:var(--text-main);">
                <button class="btn btn-sm btn-outline" onclick="this.parentElement.remove()" style="aspect-ratio:1; padding:0; width:40px; display:flex; align-items:center; justify-content:center;">✕</button>
            `;
            container.appendChild(row);
        }

        async function sendBC() {
            const bcType = document.getElementById('bcType').value;
            let message = "";
            let pollOptions = null;

            if (bcType === 'poll') {
                message = document.getElementById('bcPollQuestion').value;
                const optInputs = document.querySelectorAll('.bc-poll-opt-input');
                const opts = Array.from(optInputs).map(i => i.value.trim()).filter(v => v !== "");
                if (opts.length > 0) pollOptions = opts.join('|');
            } else {
                message = document.getElementById('bcMsg').value;
            }

            const platform = document.getElementById('bcPlatform').value;
            const badge = document.getElementById('bcBadge').value;
            const start_at = document.getElementById('bcStart').value;
            const end_at = document.getElementById('bcEnd').value;
            const pollAllowFree = document.getElementById('bcPollFree').checked;

            if (!message && bcFiles.length === 0) return showToast(t('dom_crivez_un_message_o', "Écrivez un message ou ajoutez un média."), 'error');
            
            const ok = await showModal('Diffusion', `Envoyer cette diffusion ?\n${bcFiles.length > 0 ? bcFiles.length + ' média(s) joints' : 'Texte uniquement'}`);
            if (!ok) return;
            
            try {
                const formData = new FormData();
                formData.append('message', message);
                formData.append('platform', platform);
                formData.append('badge', badge);
                if (start_at) formData.append('start_at', new Date(start_at).toISOString());
                if (end_at) formData.append('end_at', new Date(end_at).toISOString());

                // Poll properties
                if (pollOptions) formData.append('poll_options', pollOptions);
                formData.append('poll_allow_free', pollAllowFree);

                // Pre-uploaded URLs for republish
                if (bcUrls.length > 0) formData.append('media_urls', JSON.stringify(bcUrls));

                bcFiles.forEach((f, i) => formData.append('media_' + i, f));
                formData.append('media_count', bcFiles.length);

                const r = await fetch('/api/broadcast', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${TOKEN}` },
                    body: formData
                });
                const res = await r.json();
                if (!r.ok) throw new Error(res.error || 'Erreur serveur');
                
                showToast(t('dom_diffusion_lanc_e', "🚀 Diffusion lancée !"), 'success');
                
                // Clear all fields
                document.getElementById('bcMsg').value = '';
                document.getElementById('bcPollQuestion').value = '';
                document.getElementById('bcBadge').value = '';
                document.querySelectorAll('.bc-poll-opt-input').forEach(i => i.value = '');
                document.getElementById('bcPollFree').checked = false;
                
                resetTiming('start');
                resetTiming('end');
                bcFiles = [];
                bcUrls = [];
                renderBcGrid();
            } catch (e) {
                showToast('Erreur: ' + e.message, 'error');
            }
        }


        async function viewDiagnosticLogs() {
            window.open(`/api/debug/logs?token=${TOKEN}`, '_blank');
        }

        function initDragAndDrop(zoneId, previewId, urlInputId, typeInputId = null, type) {
            const zone = document.getElementById(zoneId);
            if (!zone) return; // Skip if element doesn't exist
            zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) uploadMultipleFiles(files, type);
            });
        }

        initDragAndDrop('prod_drop_zone', 'prod_preview', 'prod_image_url', null, 'prod');

        function handleFileUpload(input, type) {
            const files = Array.from(input.files);
            if (files.length > 0) uploadMultipleFiles(files, type);
        }

        async function uploadMultipleFiles(files, type) {
            const previewId = type + '_preview';
            const urlInputId = type === 'bc' ? 'bc_media_url' : type + '_image_url';
            const typeInputId = type === 'bc' ? 'bc_media_type' : null;

            document.getElementById(previewId).innerHTML = '⌛ Téléchargement...';

            try {
                let uploadedUrls = [];
                let uploadedTypes = [];
                let htmlOut = '';

                for (let file of files) {
                    const formData = new FormData();
                    formData.append('file', file);
                    const r = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${TOKEN}` },
                        body: formData
                    });
                    const res = await r.json();
                    if (!res.success) throw new Error(res.error);

                    const fileType = file.type.startsWith('video') ? 'video' : 'photo';
                    uploadedUrls.push(res.url);
                    uploadedTypes.push(fileType);

                    if (fileType === 'photo') {
                        htmlOut += `<img src="${res.url}" style="max-height:80px; max-width:80px; margin:5px; border-radius:8px; border:1px solid var(--border)">`;
                    } else {
                        htmlOut += `<video src="${res.url}" controls muted controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false;" style="max-height:80px; max-width:80px; margin:5px; border-radius:8px; border:1px solid var(--border)"></video>`;
                    }
                }

                // Unified storage logic
                const existingValue = document.getElementById(urlInputId).value;
                let mediaArray = [];
                if (existingValue) {
                    try { mediaArray = JSON.parse(existingValue); }
                    catch (e) {
                        const type = existingValue.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? 'video' : 'photo';
                        mediaArray = [{ url: existingValue, type }];
                    }
                    if (!Array.isArray(mediaArray)) mediaArray = [mediaArray];
                }

                uploadedUrls.forEach((url, i) => {
                    mediaArray.push({ url, type: uploadedTypes[i] });
                });

                document.getElementById(urlInputId).value = JSON.stringify(mediaArray);

                if (type === 'bc' && typeInputId) {
                    document.getElementById(typeInputId).value = mediaArray.length === 1 ? mediaArray[0].type : 'multiple';
                }

                renderPreview(type);

            } catch (err) {
                showToast('Erreur upload: ' + err.message, 'error');
                renderPreview(type);
            }
        }

        function renderPreview(type) {
            const previewId = type + '_preview';
            const urlInputId = type === 'bc' ? 'bc_media_url' : type + '_image_url';
            const val = document.getElementById(urlInputId).value;
            const container = document.getElementById(previewId);
            container.innerHTML = '';

            if (!val) {
                container.parentElement.classList.remove('has-file');
                return;
            }

            let list = [];
            try { list = JSON.parse(val); } catch (e) {
                const fType = val.match(/\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i) ? 'video' : 'photo';
                list = [{ url: val, type: fType }];
            }
            if (!Array.isArray(list)) list = [list];

            list.forEach((m, idx) => {
                const item = document.createElement('div');
                item.className = 'preview-item';
                item.onclick = (e) => e.stopPropagation();

                const url = typeof m === 'string' ? m : m.url;
                const mType = typeof m === 'object' ? m.type : null;
                const isVideo = mType === 'video' || (url && url.match(/\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i));

                if (isVideo) {
                    // Ajout de #t=0.1 pour forcer l'affichage de la première frame (miniature)
                    const previewUrl = url + (url.includes('#') ? '' : '#t=0.1');
                    item.innerHTML = `
                            <video src="${previewUrl}" muted preload="metadata" data-full-url="${url}" controls controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false;"></video>
                            <div class="remove-media" onclick="removeMedia(${idx}, '${type}')">✕</div>
                        `;
                } else {
                    item.innerHTML = `
                            <img src="${url}">
                            <div class="remove-media" onclick="removeMedia(${idx}, '${type}')">✕</div>
                        `;
                }
                container.appendChild(item);
            });
            container.parentElement.classList.add('has-file');
        }

        function removeMedia(idx, type) {
            const urlInputId = type === 'bc' ? 'bc_media_url' : type + '_image_url';
            const val = document.getElementById(urlInputId).value;
            let list = [];
            try { list = JSON.parse(val); } catch (e) {
                const fType = val.match(/\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i) ? 'video' : 'photo';
                list = [{ url: val, type: fType }];
            }
            if (!Array.isArray(list)) list = [list];

            list.splice(idx, 1);
            document.getElementById(urlInputId).value = list.length === 0 ? '' : JSON.stringify(list);
            renderPreview(type);
        }

        /* EXPORT & UTILS */
        async function filterInsights() {
            const query = document.getElementById('insight-search').value.toLowerCase();
            if (!window.lastAnalytics) return;
            renderFilteredInsights(window.lastAnalytics, query);
        }

        /* ANALYTICS LOGIC */
        function switchInsightsView(mode) {
            document.getElementById('insights-view-charts').style.display = mode === 'charts' ? '' : 'none';
            document.getElementById('insights-view-table').style.display = mode === 'table' ? '' : 'none';
            document.getElementById('insights-view-stocks').style.display = mode === 'stocks' ? '' : 'none';
            document.getElementById('btn-view-charts').classList.toggle('active', mode === 'charts');
            document.getElementById('btn-view-table').classList.toggle('active', mode === 'table');
            document.getElementById('btn-view-stocks').classList.toggle('active', mode === 'stocks');
        }

        function renderStockTable(rows) {
            const tbody = document.getElementById('stock-analytics-table');
            if (!tbody) return;
            tbody.innerHTML = rows.map(r => `
                <tr>
                    <td style="font-weight:600;">${r.name}</td>
                    <td style="opacity:0.8;">${r.category}</td>
                    <td style="text-align:right;">${r.price}</td>
                    <td style="text-align:center; vertical-align:middle;">${r.progressHtml}</td>
                    <td style="text-align:right; font-weight:700;">${r.stock}</td>
                    <td style="text-align:center;">${r.statusBadge}</td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center; padding:20px; opacity:0.5;">Aucun produit.</td></tr>';
        }

        function filterStockTable() {
            const query = document.getElementById('stock-search').value.toLowerCase();
            const filtered = (window.stockData || []).filter(r => 
                r.name.toLowerCase().includes(query) || r.category.toLowerCase().includes(query)
            );
            renderStockTable(filtered);
        }

        async function runBackfillCities() {
            const btn = document.getElementById('btn-backfill-cities');
            if (btn) { btn.disabled = true; btn.textContent = '⏳ En cours...'; }
            try {
                const res = await api('/analytics/backfill-cities', 'POST');
                showToast(`✅ ${res.updated} commandes mises à jour, ${res.failed} échecs. Rechargement...`, 'success');
                setTimeout(() => loadData('insights'), 1500);
            } catch (e) {
                showToast('❌ Erreur: ' + e.message, 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = '🔧 Corriger villes inconnues'; }
            }
        }

        function setTimeframe(tf, btn) {
            window.currentTimeframe = tf;
            document.querySelectorAll('#section-insights .btn-sm').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMainChart(tf);
        }

        function renderMainChart(tf) {
            const data = window.lastAnalytics;
            if (!data) return;

            const platform = document.getElementById('insights-platform-filter').value;
            const chartId = 'canvas-main-chart';
            if (chartInstances.main) chartInstances.main.destroy();

            let label = "";
            let sourceData = {};

            // Determine source data based on platform filter
            const baseData = (platform === 'all') ? data : (data.byPlatform[platform] || {});

            switch (tf) {
                case 'hour': label = "CA par Heure"; sourceData = baseData.byHour || {}; break;
                case 'day': label = "CA par Jour"; sourceData = baseData.byDay || {}; break;
                case 'week': label = "CA par Semaine"; sourceData = baseData.byWeek || {}; break;
                case 'month': label = "CA par Mois"; sourceData = baseData.byMonth || {}; break;
                case 'year': label = "CA par Année"; sourceData = baseData.byYear || {}; break;
            }

            // Update View Title
            document.getElementById('chart-title').innerText = `📈 ${label}`;
            const avgBasket = (platform === 'all') ? data.avgBasket : (data.byPlatform[platform]?.avgBasket || 0);
            document.getElementById('avg-basket-size').innerText = (parseFloat(avgBasket) || 0).toFixed(2) + ' €';
            document.getElementById('avg-basket-platform').innerText = (platform === 'all') ? 'Toutes plateformes' : (platform === 'telegram' ? 'Telegram Only' : 'WhatsApp Only');

            // Update CA Global dynamically based on platform filter
            const caGlobalEl = document.getElementById('statCA');
            const ovCaGlobalEl = document.getElementById('ovStatCA');
            const filteredCA = (platform === 'all') ? (data.totalCA || 0) : (data.byPlatform[platform]?.ca || 0);
            
            if (caGlobalEl) caGlobalEl.innerText = filteredCA.toLocaleString('fr-FR') + ' €';
            if (ovCaGlobalEl) ovCaGlobalEl.innerText = filteredCA.toLocaleString('fr-FR') + ' €';

            // Also update order count
            const orderCountEl = document.getElementById('statOrders');
            const ovOrderCountEl = document.getElementById('ovStatOrders');
            const filteredCount = (platform === 'all') ? (data.totalOrders || 0) : (data.byPlatform[platform]?.count || 0);
            
            if (orderCountEl) orderCountEl.innerText = filteredCount;
            if (ovOrderCountEl) ovOrderCountEl.innerText = filteredCount;

            const entries = Object.entries(sourceData).sort((a, b) => a[0].localeCompare(b[0]));

            chartInstances.main = new Chart(document.getElementById(chartId), {
                type: 'line',
                data: {
                    labels: entries.map(e => e[0]),
                    datasets: [{
                        label: 'CA (€)',
                        data: entries.map(e => e[1]),
                        borderColor: '#ff0050',
                        backgroundColor: 'rgba(255, 0, 80, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#ff0050'
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#262626' }, ticks: { color: '#a8a8a8' } },
                        x: { grid: { display: false }, ticks: { color: '#a8a8a8' } }
                    }
                }
            });
            document.getElementById('chart-title').innerText = `📈 ${label}`;
        }

        function filterInsights() {
            const query = document.getElementById('insight-search').value.toLowerCase();
            if (!window.lastAnalytics) return;
            renderFilteredInsights(window.lastAnalytics, query);
        }

        function renderFilteredInsights(data, query = "") {
            // Render Drivers
            const driversHtml = Object.entries(data.byDriver || {})
                .filter(([name]) => name.toLowerCase().includes(query))
                .sort((a, b) => b[1].count - a[1].count)
                .map(([name, val]) => `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span style="font-size:13px;">${name}</span>
                        <span style="font-weight:700; color:var(--success);">${val.count} liv.</span>
                    </div>
                `).join('');
            document.getElementById('list-top-drivers').innerHTML = driversHtml || '<div style="padding:10px; color:var(--text-muted)">—</div>';

            // Render Products
            const prodsHtml = Object.entries(data.byProduct || {})
                .filter(([name]) => name.toLowerCase().includes(query))
                .sort((a, b) => b[1].qty - a[1].qty)
                .map(([name, val]) => `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span style="font-size:13px;">${name}</span>
                        <span style="font-weight:700;">${val.qty}</span>
                    </div>
                `).join('');
            document.getElementById('list-top-products').innerHTML = prodsHtml || '<div style="padding:10px; color:var(--text-muted)">—</div>';

            // Render Users
            const usersHtml = Object.entries(data.byUser || {})
                .filter(([name]) => name.toLowerCase().includes(query))
                .sort((a, b) => b[1].count - a[1].count)
                .map(([name, val]) => `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span style="font-size:13px;">${name}</span>
                        <span style="font-weight:700; color:var(--accent);">${val.count} cmd.</span>
                    </div>
                `).join('');
            document.getElementById('list-top-users').innerHTML = usersHtml || '<div style="padding:10px; color:var(--text-muted)">—</div>';
        }

        function toggleDistricts(rowId) {
            const rows = document.querySelectorAll(`tr.district-row#${rowId}`);
            if (!rows.length) return;
            const isHidden = rows[0].style.display === 'none';
            rows.forEach(r => r.style.display = isHidden ? 'table-row' : 'none');
        }

        function exportAnalyticsCSV() {

            const platform = document.getElementById('insights-platform-filter')?.value || 'all';
            let data = window.currentAnalyticsRaw || [];
            
            if (platform !== 'all') {
                data = data.filter(d => d.platform === platform);
            }

            if (!data || data.length === 0) return showToast(t('dom_aucune_donn_e_export', "Aucune donnée à exporter."), 'info');

            const headers = ["ID", "Date", "Plateforme", "Client", "Produit", "Quantité", "Prix total (€)", "Ville", "Livreur"];
            const rows = data.map(o => [
                o.id, o.date, o.platform || 'tg', o.client, o.product, o.qty, o.price, o.city, o.livreur
            ]);

            let csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Added BOM for Excel UTF-8
                + headers.join(",") + "\n"
                + rows.map(r => r.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `analytics_shoptonbot_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        /* LOGIC FUNCTIONS */
        async function saveProduct() {
            const pid = document.getElementById('edit_prod_id').value;
            const name = document.getElementById('prod_name').value;
            const description = document.getElementById('prod_description').value;
            const priceVal = document.getElementById('prod_price').value.replace(',', '.');
            const unitVal = document.getElementById('prod_unit_value').value.replace(',', '.');
            const price = parseFloat(priceVal);
            const unit_value = unitVal; // On garde en string pour préserver le format (ex: 1.5)

            if (!name || isNaN(price)) return showToast(t('dom_nom_et_prix_requis', "Nom et prix requis"), 'error');

            const stockValStr = document.getElementById('edit_prod_stock')?.value;
            if (stockValStr === undefined || stockValStr === '' || isNaN(parseInt(stockValStr)) || parseInt(stockValStr) < 0) {
                return showToast(t('dom_vous_devez_obligatoi', "Vous devez obligatoirement spécifier une quantité de stock disponible."), 'error');
            }
            const stock = parseInt(stockValStr);

            const unit = document.getElementById('prod_unit').value;
            const promo = document.getElementById('prod_promo').value;
            const image_url = document.getElementById('prod_image_url').value;
            const is_bundle = document.getElementById('prod_is_bundle').checked;
            const has_discounts = document.getElementById('prod_has_discounts').checked;
            const is_active = document.getElementById('edit_prod_active')?.checked ?? true;

            const bundle_config = {
                trigger_qty: parseInt(document.getElementById('bundle_trigger_qty').value) || 1,
                offered_qty: parseInt(document.getElementById('bundle_offered_qty').value) || 1,
                offered_id: document.getElementById('bundle_offered_id').value || null
            };

            const discounts_config = [];
            if (has_discounts) {
                const rows = document.querySelectorAll('.discount-row');
                rows.forEach(r => {
                    const qty = parseInt(r.querySelector('.discount-qty').value);
                    const totalVal = r.querySelector('.discount-price').value.replace(',', '.');
                    const total = parseFloat(totalVal);
                    if (!isNaN(qty) && !isNaN(total)) discounts_config.push({ qty, total });
                });
                discounts_config.sort((a, b) => a.qty - b.qty);
            }

            try {
                const supplier_id = document.getElementById('prod_supplier_id').value || null;
                const payload = {
                    name, description, price, unit, unit_value, promo, image_url,
                    is_bundle, bundle_config,
                    has_discounts, discounts_config,
                    supplier_id, is_active, stock,
                    is_mp: document.getElementById('edit_prod_is_mp').value === 'true'
                };
                if (pid) payload.id = pid;

                await api('/products', 'POST', payload);
                showToast(t('dom_produit_sauvegard', "Produit sauvegardé !"), 'success');
                clearProdForm();
                loadData('products');
                switchProductTab('list');
            } catch (e) {
                console.error("[SAVE-PROD-ERROR]", e);
                showToast('Erreur: ' + e.message, 'error');
            }
        }

        async function editProdByIndex(idx) {
            const products = window._cachedProducts;
            if (!products || !products[idx]) return;
            const p = products[idx];

            // On s'assure que la liste des fournisseurs est prête
            loadSupplierDropdown();
            
            // On switch l'onglet
            switchProductTab('add');

            document.getElementById('prod_form_title').textContent = 'Modifier : ' + p.name;
            document.getElementById('edit_prod_id').value = p.id;
            document.getElementById('prod_name').value = p.name;
            document.getElementById('prod_description').value = p.description || '';
            document.getElementById('prod_price').value = p.price;
            document.getElementById('prod_unit').value = p.unit || '';
            document.getElementById('prod_unit_value').value = p.unit_value || '';
            document.getElementById('prod_promo').value = p.promo || '';
            document.getElementById('prod_category').value = p.category || '';
            document.getElementById('prod_image_url').value = p.image_url || '';
            renderPreview('prod');
            document.getElementById('prod_supplier_id').value = p.supplier_id || '';
            
            // Nouveau: Champs statut et stock
            const activeEl = document.getElementById('edit_prod_active');
            if (activeEl) {
                activeEl.checked = p.is_active !== false;
                const lbl = activeEl.parentElement.querySelector('.status-label');
                if (lbl) lbl.innerText = activeEl.checked ? 'ACTIF' : 'INACTIF';
            }
            const stockEl = document.getElementById('edit_prod_stock');
            if (stockEl) stockEl.value = p.stock || 0;
            const isMpEl = document.getElementById('edit_prod_is_mp');
            if (isMpEl) isMpEl.value = p.is_mp ? 'true' : 'false';

            document.getElementById('prod_is_bundle').checked = !!p.is_bundle;
            if (p.bundle_config) {
                document.getElementById('bundle_trigger_qty').value = p.bundle_config.trigger_qty || 1;
                document.getElementById('bundle_offered_qty').value = p.bundle_config.offered_qty || 1;
                document.getElementById('bundle_offered_id').value = p.bundle_config.offered_id || '';
            } else {
                document.getElementById('bundle_trigger_qty').value = 1;
                document.getElementById('bundle_offered_qty').value = 1;
                document.getElementById('bundle_offered_id').value = '';
            }

            document.getElementById('prod_has_discounts').checked = !!p.has_discounts;
            const dList = document.getElementById('discounts_list');
            dList.innerHTML = '';
            if (p.discounts_config && p.discounts_config.length > 0) {
                p.discounts_config.forEach(d => addDiscountRow(d.qty, d.total));
            } else if (p.has_discounts) {
                addDiscountRow();
            }

            // Ouvrir les options avancées si des valeurs avancées sont remplies
            const hasAdvanced = p.unit || p.promo || p.is_bundle || p.has_discounts || p.supplier_id;
            const advSection = document.getElementById('prod_advanced');
            if (hasAdvanced && advSection) {
                advSection.style.display = 'block';
                const arrow = advSection.parentElement.querySelector('.adv-arrow');
                if (arrow) arrow.textContent = '▾';
            }

            toggleBundleArea();
            toggleDiscountsArea();

            // Detect product type for UX
            if (p.has_discounts) setProductType('degressif', false);
            else if (p.is_bundle) setProductType('bundle', false);
            else setProductType('standard', false);

            renderPreview('prod');
            switchProductTab('add');
        }

        function setProductType(type, scroll = true) {
            // Update buttons
            document.querySelectorAll('.btn-prod-type').forEach(b => b.classList.remove('active'));
            if(type === 'standard') document.getElementById('type-std').classList.add('active');
            if(type === 'degressif') document.getElementById('type-deg').classList.add('active');
            if(type === 'bundle') document.getElementById('type-bun').classList.add('active');

            // Open advanced section
            const advSection = document.getElementById('prod_advanced');
            if (advSection) {
                advSection.style.display = 'block';
                const arrow = advSection.parentElement.querySelector('.adv-arrow');
                if (arrow) arrow.textContent = '▾';
            }

            // Toggle Toggles
            if (type === 'standard') {
                document.getElementById('prod_is_bundle').checked = false;
                document.getElementById('prod_has_discounts').checked = false;
            } else if (type === 'bundle') {
                document.getElementById('prod_is_bundle').checked = true;
                document.getElementById('prod_has_discounts').checked = false;
            } else if (type === 'degressif') {
                document.getElementById('prod_is_bundle').checked = false;
                document.getElementById('prod_has_discounts').checked = true;
            }

            toggleBundleArea();
            toggleDiscountsArea();

            if (scroll) {
                const targetId = type === 'bundle' ? 'bundle_config_area' : (type === 'degressif' ? 'discounts_config_area' : 'prod_advanced');
                document.getElementById(targetId).scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Tiny flash effect to highlight
                const el = document.getElementById(targetId);
                el.style.transition = '0.3s';
                el.style.background = 'rgba(255,255,255,0.1)';
                setTimeout(() => el.style.background = '', 500);
            }
        }

        function previewMagicParse() {
            const val = document.getElementById('quick_paste_tiers').value.trim();
            const preview = document.getElementById('magic_preview_card');
            const content = document.getElementById('magic_preview_content');
            
            if (!val) {
                preview.style.display = 'none';
                return;
            }

            const data = magicParseCore(val);
            preview.style.display = 'block';

            if (data.type === 'bundle') {
                content.innerHTML = `🎁 <b>DÉTECTÉ : OFFRE CADEAU</b><br>Si le client achète <b>${data.config.trigger}</b>, il reçoit <b>${data.config.offered}</b> offert.`;
                preview.style.borderColor = 'orange';
            } else if (data.type === 'degressif') {
                const tiersTxt = data.tiers.map(t => `${t.qty}g:${t.price}€`).join(' | ');
                content.innerHTML = `📉 <b>DÉTECTÉ : PRIX DÉGRESSIFS</b><br>Base: <b>${data.base.qty}g / ${data.base.price}€</b><br>Paliers : ${tiersTxt}`;
                preview.style.borderColor = '#00bfff';
            } else {
                content.innerHTML = `⚠️ <b>AUCUNE STRUCTURE DÉTECTÉE</b><br>Format : '1:10€, 3:25€' ou '2 achetés = 1 offert'`;
                preview.style.borderColor = 'rgba(255,255,255,0.1)';
            }
        }

        function magicParseCore(text) {
            const val = text.toLowerCase();
            
            // 1. Detection Bundle (Acheté / Offert / Gratuit)
            if (val.includes('offert') || val.includes('gratuit') || val.includes('acheté') || val.includes('cadeau')) {
                const nums = val.match(/\d+/g);
                if (nums && nums.length >= 2) {
                    return { type: 'bundle', config: { trigger: parseInt(nums[0]), offered: parseInt(nums[1]) } };
                }
            }

            // 2. Detection Dégressif
            const regex = /(\d+(?:\.\d+)?)[\s:=\-g\/€]+(\d+(?:\.\d+)?)/g;
            let match;
            const tiers = [];
            while ((match = regex.exec(val)) !== null) {
                // On vérifie si ce n'est pas un texte explicatif de bundle
                if (!val.includes('acheté') && !val.includes('offert')) {
                    tiers.push({ qty: parseFloat(match[1]), price: parseFloat(match[2]) });
                }
            }

            if (tiers.length > 0) {
                tiers.sort((a,b) => a.qty - b.qty);
                const base = tiers[0];
                return { type: 'degressif', base: base, tiers: tiers };
            }

            return { type: 'none' };
        }

        function applyMagicParse() {
            const val = document.getElementById('quick_paste_tiers').value.trim();
            if(!val) return;

            const data = magicParseCore(val);
            if (data.type === 'none') return showToast(t('dom_format_non_reconnu', "Format non reconnu"), 'info');

            if (data.type === 'bundle') {
                setProductType('bundle');
                document.getElementById('bundle_trigger_qty').value = data.config.trigger;
                document.getElementById('bundle_offered_qty').value = data.config.offered;
                showToast(`🎁 Offre ${data.config.trigger}+${data.config.offered} configurée !`, 'success');
            } else if (data.type === 'degressif') {
                setProductType('degressif');
                document.getElementById('prod_unit_value').value = data.base.qty;
                document.getElementById('prod_price').value = data.base.price;
                
                const list = document.getElementById('discounts_list');
                list.innerHTML = '';
                if (data.tiers.length > 1) {
                    data.tiers.slice(1).forEach(t => {
                        const relQty = t.qty / data.base.qty;
                        addDiscountRow(relQty, t.price);
                    });
                }
                showToast(`📉 Base ${data.base.qty}g à ${data.base.price}€ configurée !`, 'success');
            }

            document.getElementById('quick_paste_tiers').value = '';
            document.getElementById('magic_preview_card').style.display = 'none';
        }

        function toggleBundleArea() {
            const isBundle = document.getElementById('prod_is_bundle').checked;
            document.getElementById('bundle_config_area').style.display = isBundle ? 'block' : 'none';
        }

        function toggleDiscountsArea() {
            const hasDiscounts = document.getElementById('prod_has_discounts').checked;
            document.getElementById('discounts_config_area').style.display = hasDiscounts ? 'block' : 'none';
            if (hasDiscounts && document.getElementById('discounts_list').children.length === 0) {
                addDiscountRow();
            }
        }

        function addDiscountRow(qty = '', price = '', stock = '', unit = '', is_absolute = true) {
            const div = document.createElement('div');
            div.className = 'discount-row';
            div.style = 'display:grid; grid-template-columns: 1fr 1fr 1fr 30px; gap:6px; align-items:end; background:rgba(255,255,255,0.03); padding:8px; border-radius:8px;';
            
            // Si c'est un ancien produit, on le laisse en multiplicateur (is_absolute = false)
            // Sinon on utilise la nouvelle méthode
            const absoluteChecked = is_absolute !== false;
            
            const unitOptions = `
                <option value="g" ${unit==='g'?'selected':''}>g</option>
                <option value="U" ${unit==='U'?'selected':''}>U</option>
                <option value="ml" ${unit==='ml'?'selected':''}>ml</option>
                <option value="L" ${unit==='L'?'selected':''}>L</option>
                <option value="kg" ${unit==='kg'?'selected':''}>kg</option>
                <option value="mg" ${unit==='mg'?'selected':''}>mg</option>
            `;

            div.innerHTML = `
                <div>
                    <label style="font-size:10px">Format / Unité</label>
                    <div style="display:flex; gap:4px;">
                        <input type="number" step="0.1" class="discount-qty" value="${qty}" placeholder="Ex: 4.5" style="height:36px; font-size:12px; margin:0; border-radius:8px; flex:2; min-width:40px;">
                        <select class="discount-unit" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:white; font-size:12px; height:36px; padding:0 4px; flex:1;">
                            ${unitOptions}
                        </select>
                        <input type="hidden" class="discount-absolute" value="${absoluteChecked ? 'true' : 'false'}">
                    </div>
                </div>
                <div>
                    <label style="font-size:10px">Prix (€)</label>
                    <input type="number" class="discount-price" value="${price}" placeholder="Prix" min="0" step="0.01" style="height:36px; font-size:12px; margin:0; border-radius:8px;">
                </div>
                <div>
                    <label style="font-size:10px">Stock</label>
                    <input type="number" class="discount-stock" value="${stock}" placeholder="Qté" min="0" style="height:36px; font-size:12px; margin:0; border-radius:8px;" oninput="if(typeof calculateTotalStock === 'function') calculateTotalStock()">
                </div>
                <button class="btn btn-sm btn-outline text-danger" onclick="this.parentElement.remove(); if(typeof calculateTotalStock === 'function') calculateTotalStock();" style="padding:8px; margin-bottom:0; height:36px; display:flex; align-items:center; justify-content:center;">🗑️</button>
            `;
            document.getElementById('discounts_list').appendChild(div);
            if(typeof calculateTotalStock === 'function') calculateTotalStock();
        }

        function clearProdForm() {
            document.getElementById('prod_form_title').textContent = 'Nouveau produit';
            document.getElementById('edit_prod_id').value = '';
            document.getElementById('prod_name').value = '';
            document.getElementById('prod_description').value = '';
            if (document.getElementById('edit_prod_stock')) document.getElementById('edit_prod_stock').value = '';
            document.getElementById('prod_price').value = '';
            document.getElementById('prod_unit').value = '';
            document.getElementById('prod_unit_value').value = '';
            document.getElementById('prod_promo').value = '';
            document.getElementById('prod_image_url').value = '';
            renderPreview('prod');
            document.getElementById('prod_supplier_id').value = '';
            document.getElementById('prod_is_bundle').checked = false;
            document.getElementById('prod_has_discounts').checked = false;
            document.getElementById('bundle_trigger_qty').value = 1;
            document.getElementById('bundle_offered_qty').value = 1;
            document.getElementById('bundle_offered_id').value = '';
            document.getElementById('discounts_list').innerHTML = '';
            // Fermer les options avancées
            const advSection = document.getElementById('prod_advanced');
            if (advSection) {
                advSection.style.display = 'none';
                const arrow = advSection.parentElement.querySelector('.adv-arrow');
                if (arrow) arrow.textContent = '▸';
            }
            toggleBundleArea();
            toggleDiscountsArea();
            setProductType('standard', false);
            document.getElementById('quick_paste_tiers').value = '';
            renderPreview('prod');
        }

        async function delProd(id) {
            const ok = await showModal('Supprimer', 'Supprimer ce produit ?');
            if (!ok) return;
            try {
                await api('/products/' + id, 'DELETE');
                loadData('products');
                showToast(t('dom_produit_supprim', "Produit supprimé"), 'success');
            } catch (e) {
                showToast(e.message, 'error');
            }
        }

        async function moveProd(idx, dir) {
            // OBSOLÈTE: Remplacé par reorderProducts pour SortableJS
        }

        async function reorderProducts(ids) {
            const products = window._cachedProducts;
            if (!products) return;

            // On génère une séquence de timestamps croissants
            const now = Date.now();
            const updates = ids.map((id, index) => {
                const p = products.find(x => x.id === id);
                if (!p) return null;
                // On utilise des ISO strings pour Supabase
                const baseTime = new Date().getTime();
                return api('/products', 'POST', { ...p, created_at: new Date(baseTime + index).toISOString() });
            }).filter(Boolean);

            try {
                showToast(t('dom_mise_jour_de_l_ordre', "Mise à jour de l\'ordre..."), 'info');
                await Promise.all(updates);
                await loadData('products');
                showToast(t('dom_ordre_enregistr', "Ordre enregistré !"), 'success');
            } catch (e) {
                console.error("[REORDER-ERROR]", e);
                showToast(t('dom_erreur_lors_du_tri', "Erreur lors du tri"), 'error');
            }
        }

        async function toggleProdFeature(idx, feature) {
            const products = window._cachedProducts;
            if (!products || !products[idx]) return;
            const p = products[idx];

            const payload = { ...p };
            if (feature === 'bundle') payload.is_bundle = !p.is_bundle;
            if (feature === 'paliers') payload.has_discounts = !p.has_discounts;

            try {
                showToast(t('dom_mise_jour', "Mise à jour..."), 'info');
                await api('/products', 'POST', payload);
                await loadData('products');
                showToast(`${feature === 'bundle' ? 'Cadeau' : 'Paliers'} mis à jour`, 'success');
            } catch (e) {
                showToast(t("error"), 'error');
            }
        }

        async function toggleLivreur(platformId, platform, isLivreur) {
            if (!confirm(`Confirmer cette action ?`)) return;
            try {
                await api('/livreurs/status', 'POST', { userId: platformId, platform, isLivreur });
                loadData('users');
            } catch (e) { alert(e.message); }
        }

        async function toggleRole(docId, role, status) {
            if (!confirm(`Confirmer le changement de rôle (${role}) ?`)) return;
            try {
                await api('/users/role', 'POST', { docId, role, status });
                loadData('users');
            } catch (e) { alert(e.message); }
        }

        function updateNavbarIcons() {
            if (!window.appSettings) return;
            const s = window.appSettings;
            const setIcon = (id, icon) => {
                const el = document.getElementById(id);
                if (el && icon) el.innerText = icon;
            };

            setIcon('nav_icon_products', s.ui_icon_catalog);
            setIcon('nav_icon_logistique', s.ui_icon_pending);
            setIcon('nav_icon_overview', s.ui_icon_welcome);
            
            const usersLabel = s.label_users || 'Utilisateurs';
            const uDesk = document.getElementById('label_users_desktop');
            if (uDesk) uDesk.innerText = usersLabel;
            const uMob = document.getElementById('label_users_mobile');
            if (uMob) uMob.innerText = usersLabel;

            const brand = document.getElementById('brand_name');
            const mobTitle = document.getElementById('mobile_title');
            const pgTitle = document.getElementById('page_title');
            if (s.bot_name) {
                if (brand) brand.innerText = s.bot_name;
                if (mobTitle) mobTitle.innerText = s.bot_name;
                if (pgTitle) pgTitle.innerText = `${s.bot_name} - Admin`;
            }
        }

        async function approveUserAccount(userId, firstName) {
            if (!confirm(`Souhaitez-vous accorder l'accès à ${firstName} ?`)) return;
            try {
                await api('/users/approve', 'POST', { userId });
                showToast(`Accès accordé à ${firstName}`, 'success');
                refreshData(); 
            } catch (e) {
                showToast(`Erreur : ${e.message}`, 'error');
            }
        }

        async function updateOrderStatus(orderId, status) {
            await api('/orders/status', 'POST', { orderId, status });
            loadData('orders');
        }

        async function toggleLivreurAvailability(docId, isAvailable) {
            const isNewState = !isAvailable;
            await api('/livreurs/availability', 'POST', { id: docId, isAvailable: isNewState });
            showToast(`Livreur ${isNewState ? 'disponible' : 'indisponible'} !`);
            loadData('livreurs');
        }

        async function toggleLivreur(userId, platform, isLivreur) {
            await api('/livreurs/status', 'POST', { userId, platform, isLivreur });
            loadData('users');
        }

        // Debounce pour éviter la latence réseau
        function debounce(f, ms) {
            let t;
            return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); };
        }

        window._userTab = 'active';

        function switchUserTab(tab) {
            window._userTab = tab;
            document.getElementById('btn-user-tab-active').classList.toggle('active', tab === 'active');
            document.getElementById('btn-user-tab-pending').classList.toggle('active', tab === 'pending');
            document.getElementById('btn-user-tab-blocked').classList.toggle('active', tab === 'blocked');
            
            const searchInput = document.getElementById('q_filter_sys_users');
            if (searchInput && searchInput.value && searchInput.value.length >= 2) {
                // Si une recherche est en cours, relancer la recherche avec le nouvel onglet
                searchUsersUI();
            } else {
                // Sinon, recharger la liste standard de l'onglet
                if (searchInput) {
                    searchInput.value = ''; // clean up just in case
                    searchInput.setAttribute('readonly', 'true'); // reset hack
                }
                
                // Show loading indicator in table
                const table = document.getElementById('userTable');
                if (table) table.innerHTML = '<tr><td colspan="4" style="padding:50px; text-align:center;"><div class="spinner" style="margin:0 auto 10px;"></div>Chargement des utilisateurs...</td></tr>';
                
                loadData('users');
            }
        }

        const searchUsersUI = debounce(async () => {
            const q = document.getElementById('q_filter_sys_users').value;
            if (q.length < 2) {
                loadData('users');
                return;
            }
            try {
                const results = await api('/users/search?q=' + encodeURIComponent(q) + '&tab=' + (window._userTab || 'active'));
                renderUsersTable(results);
            } catch (e) { }
        }, 300);

        const searchOrdersUI = debounce(async () => {
            const q = document.getElementById('q_filter_sys_orders').value;
            if (q.length < 2) {
                loadData('orders');
                return;
            }
            try {
                const results = await api('/orders/search?q=' + encodeURIComponent(q));
                window._cachedOrders = results;
                renderOrdersTable(results);
            } catch (e) { }
        }, 300);

        const searchLivreursUI = debounce(async () => {
            const q = document.getElementById('livreur-search').value;
            if (q.length < 2) {
                loadData('livreurs');
                return;
            }
            try {
                const results = await api('/livreurs/search?q=' + encodeURIComponent(q));
                renderLivreursTable(results);
            } catch (e) { }
        }, 300);

        async function syncAllUsersStatus() {
            if (!window._cachedUsers || window._cachedUsers.length === 0) return;
            const ok = await showModal('Sync Statuts', `Voulez-vous vérifier le statut Telegram de tous les utilisateurs affichés (${window._cachedUsers.length}) ?`);
            if (!ok) return;

            showToast(t('dom_synchronisation_d_ma', "Synchronisation démarrée..."), 'info');
            let blockedCount = 0;
            let activeCount = 0;

            for (const u of window._cachedUsers) {
                try {
                    const res = await api('/users/check-status', 'POST', { id: u.doc_id });
                    if (res.status === 'blocked') blockedCount++;
                    else activeCount++;
                    await new Promise(r => setTimeout(r, 200)); // Petit délai pour Telegram rate limits
                } catch (e) { }
            }

            showToast(`Sync terminée ! ${activeCount} actifs, ${blockedCount} bloqués.`);
            loadData('users');
        }

        async function editUserProfileUI(userId, currentName, currentPhone) {
            await showFormModal("Modifier le Profil", [
                { label: "Nom du client", id: "name", value: currentName },
                { label: "Numéro de téléphone", id: "phone", value: currentPhone, placeholder: "Ex: +336..." }
            ], async (vals) => {
                await api('/users/profile', 'POST', { userId, first_name: vals.name, phone: vals.phone });
                showToast(t('dom_profil_mis_jour', "Profil mis à jour !"), "success");
                loadData('users');
            });
        }

        function renderUsersTable(users) {
            window._cachedUsers = users; // Keep for sync

            // ========== DESKTOP TABLE ==========
            const userTableEl = document.getElementById('userTable');
            if (userTableEl) {
                userTableEl.innerHTML = users.map(u => `
                    <tr>
                        <td data-label="Identité">
                            <div class="user-info">
                                <div class="avatar">${u.first_name ? u.first_name[0] : '?'}</div>
                                <div>
                                    <div style="display:flex; align-items:center; gap:5px;">
                                        <b>${u.first_name || 'Inconnu'}</b>
                                        <span class="badge" style="background:rgba(0,136,204,0.1); color:#0088cc; border:1px solid currentColor; font-size:9px; font-weight:800; padding:1px 5px;">TG</span>
                                    </div>
                                    ${(() => { if (!u.created_at) return ''; const diff = (new Date() - new Date(u.created_at)) / (1000*60*60); if (diff < 24) return '<span class="badge" style="background:rgba(255,215,0,0.1); color:#ffd700; border:1px solid #ffd700; font-size:10px;">🌟 NOUVEAU</span>'; return ''; })()}
                                    ${u.is_blocked ? (u.data && u.data.blocked_by_admin === false ? '<span class="badge" style="background:rgba(255,50,50,0.1); color:#ff5050; margin-left:5px; border:1px solid rgba(255,20,20,0.2)">BOT BLOQUÉ PAR CLIENT</span>' : '<span class="badge badge-cancelled" style="margin-left:5px">BANNISSEMENT ADMIN</span>') : ''}
                                    <br><small style="color:var(--text-muted)">@${u.username || (u.platform_id ? u.platform_id.substring(0, 15) + '...' : 'Inconnu')}</small>
                                    ${u.phone ? `<br><small style="color:var(--success)">📞 ${u.phone}</small>` : ''}
                                </div>
                            </div>
                        </td>
                        <td data-label="Fidélité">
                            <div style="font-size:12px; cursor:pointer;" onclick="editPointsUI('${u.doc_id}', ${u.points || 0})">⭐ <b>${u.points || 0} pts</b> ✏️</div>
                            <div style="display:flex; align-items:center; gap:5px; font-size:11px; color:var(--success); cursor:pointer;" onclick="editWalletUI('${u.doc_id}', ${u.wallet_balance || 0})">💰 <b>${Number(u.wallet_balance || 0).toFixed(2)}€</b> ✏️</div>
                        </td>
                        <td data-label="Commandes"><span class="badge" style="border:1px solid var(--border)">${u.order_count || 0}</span></td>
                        <td data-label="Actions" class="action-btns">
                            <button class="btn btn-outline btn-sm" onclick="contactUser('${u.platform}', '${u.username || ''}', '${u.platform_id}', '${u.phone || ''}', '${u.id}')" style="border-color:#0088cc; color:#0088cc">💬 Contact</button>
                            <button class="btn btn-outline btn-sm" onclick="editUserProfileUI('${u.doc_id}', '${(u.first_name || '').replace(/'/g, "\\'")}', '${u.phone || ''}')" style="border-color:#ff9500; color:#ff9500">✏️ Profil</button>
                            <button class="btn btn-outline btn-sm" onclick="viewUserAddresses('${u.doc_id}')" style="border-color:#5ac8fa; color:#5ac8fa">📍 Adresses</button>
                            <button class="btn btn-outline btn-sm" onclick="checkUserStatus('${u.doc_id}')" style="border-color:var(--accent); color:var(--accent)">🔄 Check</button>
                            <button class="btn btn-outline btn-sm" onclick="delUser('${u.doc_id}')">Supprimer</button>
                            ${u.is_blocked ? `<button class="btn btn-accent btn-sm" onclick="toggleBlock('${u.doc_id}', false)">Débloquer</button>` : `<button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="toggleBlock('${u.doc_id}', true)">Bloquer</button>`}
                            
                            <!-- Rôles -->
                            <div style="margin-top:5px; display:flex; gap:5px; flex-wrap:wrap;">
                                ${u.is_livreur ? `<button class="btn btn-outline btn-sm" onclick="toggleLivreur('${u.platform_id}', '${u.platform}', false)">Retirer Livreur</button>` : `<button class="btn btn-accent btn-sm" onclick="toggleLivreur('${u.platform_id}', '${u.platform}', true)">🚴 Livreur</button>`}
                                ${u.is_admin ? `<button class="btn btn-outline btn-sm" style="border-color:#ff3b30; color:#ff3b30" onclick="toggleRole('${u.doc_id}', 'admin', false)">Retirer Admin</button>` : `<button class="btn btn-sm" style="background:#ff3b30; color:#fff" onclick="toggleRole('${u.doc_id}', 'admin', true)">👑 Promouvoir Admin</button>`}
                                ${u.is_moderator ? `<button class="btn btn-outline btn-sm" style="border-color:#5856d6; color:#5856d6" onclick="toggleRole('${u.doc_id}', 'moderator', false)">Retirer Modo</button>` : `<button class="btn btn-sm" style="background:#5856d6; color:#fff" onclick="toggleRole('${u.doc_id}', 'moderator', true)">🛂 Promouvoir Modo</button>`}
                                ${!u.is_approved ? `<button class="btn btn-accent btn-sm" onclick="approveUserJS('${u.doc_id}')">✅ APPROUVER</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('');
            }

            // ========== MOBILE CARDS ==========
            const mobileFeed = document.getElementById('mobileUserFeed');
            if (mobileFeed) {
                mobileFeed.innerHTML = users.map(u => {
                    const platformColor = '#0088cc';
                    const platformBg = 'rgba(0,136,204,0.1)';
                    const isNew = u.created_at && ((new Date() - new Date(u.created_at)) / (1000*60*60) < 24);
                    const escapedName = (u.first_name || '').replace(/'/g, "\\'");

                    return `
                    <div class="m-user-card">
                        <div class="m-user-top">
                            <div class="m-user-avatar">${u.first_name ? u.first_name[0].toUpperCase() : '?'}</div>
                            <div class="m-user-info">
                                <div class="m-user-name">
                                    ${u.first_name || 'Inconnu'}
                                    <span class="m-order-platform" style="color:${platformColor}; background:${platformBg};">${u.platform?.toUpperCase() || 'TG'}</span>
                                    ${isNew ? '<span style="font-size:10px; color:#ffd700;">🌟 NEW</span>' : ''}
                                    ${u.is_blocked ? '<span style="font-size:10px; color:#ff3b30;">🚫 BLOQUÉ</span>' : ''}
                                    ${u.is_livreur ? '<span style="font-size:10px; color:#0088ff;">🚴 LIVREUR</span>' : ''}
                                    ${u.is_admin ? '<span style="font-size:10px; color:#ff3b30;">👑 ADMIN</span>' : ''}
                                    ${u.is_moderator ? '<span style="font-size:10px; color:#5856d6;">🛂 MODO</span>' : ''}
                                </div>
                                <div class="m-user-username">@${u.username || (u.platform_id ? u.platform_id.substring(0, 20) : 'Inconnu')}</div>
                            </div>
                        </div>

                        <div class="m-user-stats">
                            <div class="m-user-stat" onclick="editPointsUI('${u.doc_id}', ${u.points || 0})">
                                <div class="m-user-stat-val">⭐ ${u.points || 0}</div>
                                <div class="m-user-stat-label">Points</div>
                            </div>
                            <div class="m-user-stat" onclick="editWalletUI('${u.doc_id}', ${u.wallet_balance || 0})">
                                <div class="m-user-stat-val">💰 ${Number(u.wallet_balance || 0).toFixed(2)}€</div>
                                <div class="m-user-stat-label">Solde</div>
                            </div>
                            <div class="m-user-stat">
                                <div class="m-user-stat-val">📦 ${u.order_count || 0}</div>
                                <div class="m-user-stat-label">Cmds</div>
                            </div>
                        </div>

                        <div class="m-user-actions">
                            <button class="m-btn" onclick="contactUser('${u.platform}', '${u.username || ''}', '${u.platform_id}', '${u.phone || ''}', '${u.id}')" style="color:#0088cc; border-color:rgba(0,136,204,0.3);">💬 Contact</button>
                            <button class="m-btn" onclick="editUserProfileUI('${u.doc_id}', '${escapedName}', '${u.phone || ''}')" style="color:#ff9500; border-color:rgba(255,149,0,0.3);">✏️ Profil</button>
                            <button class="m-btn" onclick="viewUserAddresses('${u.doc_id}')" style="color:#5ac8fa; border-color:rgba(90,200,250,0.3);">📍 Adresses</button>
                            <button class="m-btn m-btn-check" onclick="checkUserStatus('${u.doc_id}')">🔄 Check</button>
                            ${u.is_blocked ?
                                `<button class="m-btn m-btn-accent" onclick="toggleBlock('${u.doc_id}', false)">🔓 Débloquer</button>` :
                                `<button class="m-btn m-btn-danger" onclick="toggleBlock('${u.doc_id}', true)">🚫 Bloquer</button>`
                            }
                            ${u.is_livreur ?
                                `<button class="m-btn" onclick="toggleLivreur('${u.platform_id}', '${u.platform}', false)" style="color:#ff9500; border-color:rgba(255,149,0,0.3);">❌ Retirer Livreur</button>` :
                                `<button class="m-btn m-btn-accent" onclick="toggleLivreur('${u.platform_id}', '${u.platform}', true)">🚴 Livreur</button>`
                            }
                            ${u.is_admin ?
                                `<button class="m-btn" style="color:#ff3b30; border-color:rgba(255,59,48,0.3);" onclick="toggleRole('${u.doc_id}', 'admin', false)">❌ Retirer Admin</button>` :
                                `<button class="m-btn" style="background:#ff3b30; color:#fff;" onclick="toggleRole('${u.doc_id}', 'admin', true)">👑 Promouvoir Admin</button>`
                            }
                            ${u.is_moderator ?
                                `<button class="m-btn" style="color:#5856d6; border-color:rgba(88,86,214,0.3);" onclick="toggleRole('${u.doc_id}', 'moderator', false)">❌ Retirer Modo</button>` :
                                `<button class="m-btn" style="background:#5856d6; color:#fff;" onclick="toggleRole('${u.doc_id}', 'moderator', true)">🛂 Promouvoir Modo</button>`
                            }
                            ${u.is_approved === false ?
                                `<button class="m-btn m-btn-approve" onclick="approveUserJS('${u.doc_id}')">✅ APPROUVER</button>` : ''
                            }
                            <button class="m-btn m-btn-danger" onclick="delUser('${u.doc_id}')" style="flex: 1 1 100%;">🗑️ Supprimer</button>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        async function checkUserStatus(id) {
            try {
                const res = await api('/users/check-status', 'POST', { id });
                if (res.status === 'blocked') showToast(t('dom_utilisateur_a_bloqu', "Utilisateur a bloqué le bot !"), 'info');
                else showToast(t('dom_utilisateur_actif', "Utilisateur actif."), 'success');
                loadData('users');
            } catch (e) { showToast(e.message, 'error'); }
        }

        async function editWalletUI(userId, current) {
            await showFormModal("Modifier le Portefeuille", [
                { label: "Nouveau solde du portefeuille (€)", id: "amount", type: "number", value: current }
            ], async (vals) => {
                const amount = parseFloat(vals.amount);
                if (isNaN(amount)) throw new Error("Montant invalide");
                await api('/users/wallet', 'POST', { userId, wallet_balance: amount });
                showToast(t('dom_cr_dit_mis_jour', "Crédit mis à jour !"), 'success');
                loadData('users');
            });
        }

        async function toggleBlock(id, doBlock) {
            const label = doBlock ? 'Bloquer' : 'Débloquer';
            const ok = await showConfirmModal("Confirmation", `Confirmer le ${label} de cet utilisateur ?`);
            if (!ok) return;
            const path = doBlock ? '/users/block' : '/users/unblock';
            try {
                await api(path, 'POST', { id });
                showToast(`Utilisateur ${doBlock ? 'bloqué' : 'débloqué'} !`, 'success');
                loadData('users');
                loadData('ov', true); // Refresh top counters
            } catch (e) { showToast(e.message, 'error'); }
        }

        async function editPointsUI(userId, current) {
            await showFormModal("Modifier les Points", [
                { label: "Nouveau solde de points", id: "points", type: "number", value: current }
            ], async (vals) => {
                const points = parseInt(vals.points);
                if (isNaN(points)) throw new Error("Nombre de points invalide");
                await api('/users/points', 'POST', { userId, points });
                showToast(t('dom_points_mis_jour', "Points mis à jour !"), 'success');
                loadData('users');
            });
        }

        async function approveUserJS(userId) {
            const ok = await showConfirmModal("Approbation", "Confirmer l'approbation de cet utilisateur ?");
            if (!ok) return;
            try {
                await api('/users/approve', 'POST', { userId });
                showToast(t('dom_utilisateur_approuv', "Utilisateur approuvé !"), 'success');
                loadData('users');
                loadData('ov', true); // Refresh top counters
            } catch (e) { showToast(e.message, 'error'); }
        }

        function renderLivreursTable(livreurs) {
            const tbody = document.getElementById('livreursTable');
            if (!livreurs || livreurs.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--text-muted)">Aucun livreur trouvé.</td></tr>';
                const mf = document.getElementById('mobileLivreurFeed');
                if (mf) mf.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">Aucun livreur trouvé.</div>';
                return;
            }

            // Desktop
            if (tbody) {
                tbody.innerHTML = livreurs.map(l => `
                    <tr style="border-bottom:1px solid var(--border)">
                        <td data-label="Livreur">
                            <div style="display:flex;align-items:center;gap:10px">
                                <div class="avatar">${l.first_name ? l.first_name[0].toUpperCase() : '?'}</div>
                                <div>
                                    <b>${l.first_name || 'Inconnu'}</b><br>
                                    <small style="color:var(--text-muted)">@${l.username || l.platform_id}</small>
                                </div>
                            </div>
                        </td>
                        <td data-label="Status">
                            <span class="badge" style="background:${l.is_available ? '#1a3a1a' : '#3a1a1a'};color:${l.is_available ? '#4caf50' : '#f44336'}">
                                ${l.is_available ? '✅ Disponible' : '⛔ Indisponible'}
                            </span>
                        </td>
                        <td data-label="Ville/Secteur">${l.current_city ? l.current_city.toUpperCase() : '—'}</td>
                        <td data-label="Actions" class="action-btns">
                            <button class="btn btn-sm ${l.is_available ? 'btn-danger' : 'btn-accent'}" onclick="toggleLivreurAvailability('${l.id || l.doc_id}', ${l.is_available})">${l.is_available ? '🔴 OFF' : '🟢 ON'}</button>
                            <button class="btn btn-sm btn-outline" onclick="showLivreurHistory('${l.id || l.doc_id}', '${l.first_name}')">📜 Historique</button>
                            <button class="btn btn-danger btn-sm" onclick="toggleLivreur('${l.platform_id}', '${l.platform}', false);loadData('livreurs')">Retirer</button>
                        </td>
                    </tr>
                `).join('');
            }

            // Mobile
            const mf = document.getElementById('mobileLivreurFeed');
            if (mf) {
                mf.innerHTML = livreurs.map(l => `
                    <div class="m-user-card">
                        <div class="m-user-top">
                            <div class="m-user-avatar" style="background:${l.is_available ? 'linear-gradient(135deg, #00b400, #008000)' : 'linear-gradient(135deg, #ff3b30, #cc0000)'};">${l.first_name ? l.first_name[0].toUpperCase() : '?'}</div>
                            <div class="m-user-info">
                                <div class="m-user-name">
                                    ${l.first_name || 'Inconnu'}
                                    <span style="font-size:10px; padding:2px 6px; border-radius:6px; font-weight:700; background:${l.is_available ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)'}; color:${l.is_available ? '#4caf50' : '#f44336'};">
                                        ${l.is_available ? '✅ Dispo' : '⛔ Off'}
                                    </span>
                                </div>
                                <div class="m-user-username">@${l.username || l.platform_id} · ${l.current_city ? l.current_city.toUpperCase() : '—'}</div>
                            </div>
                        </div>
                        <div class="m-user-actions">
                            <button class="m-btn ${l.is_available ? 'm-btn-danger' : 'm-btn-accent'}" onclick="toggleLivreurAvailability('${l.id || l.doc_id}', ${l.is_available})">${l.is_available ? '🔴 Mettre OFF' : '🟢 Mettre ON'}</button>
                            <button class="m-btn" onclick="showLivreurHistory('${l.id || l.doc_id}', '${l.first_name}')">📜 Historique</button>
                            <button class="m-btn m-btn-danger" onclick="toggleLivreur('${l.platform_id}', '${l.platform}', false);loadData('livreurs')">❌ Retirer</button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Logic for Logistics Tabs
        function switchLogisticsTab(tab) {
            const sections = ['orders', 'livreurs', 'reviews', 'suppliers'];
            sections.forEach(s => {
                const sub = document.getElementById('sub-logistics-' + s);
                if (sub) sub.style.display = (s === tab ? 'block' : 'none');

                const btn = document.getElementById('btn-tab-' + s);
                if (btn) {
                    if (s === tab) btn.classList.add('active');
                    else btn.classList.remove('active');
                }
            });

            if (tab === 'orders') loadData('orders');
            if (tab === 'livreurs') loadData('livreurs');
            if (tab === 'reviews') loadData('reviews');
        }

        async function loadSupplierDropdown() {
            const select = document.getElementById('prod_supplier_id');
            if (!select) return;
            const current = select.value;
            try {
                const suppliers = await api('/suppliers', 'GET', null, true) || [];
                select.innerHTML = '<option value="">Aucun (vente directe)</option>';
                suppliers.filter(s => s.is_active).forEach(s => {
                    select.innerHTML += `<option value="${s.id}">${s.name}${s.phone ? ' ('+s.phone+')' : ''}</option>`;
                });
                if (current) select.value = current;
            } catch(e) { /* suppliers table may not exist yet */ }
        }

        function switchProductTab(tab) {
            window._productTab = tab;
            
            const addSub = document.getElementById('sub-products-add');
            const listSub = document.getElementById('sub-products-list');
            const stockSub = document.getElementById('sub-products-stock');
            
            if (addSub) addSub.style.display = (tab === 'add' ? 'block' : 'none');
            if (listSub) listSub.style.display = ((tab === 'list' || tab === 'props') ? 'block' : 'none');
            if (stockSub) stockSub.style.display = (tab === 'stock' ? 'block' : 'none');
            
            // Fix highlight correct button
            ['add', 'list', 'stock', 'props'].forEach(s => {
                const b = document.getElementById('btn-tab-prod-' + s);
                if(b) {
                    if(s === tab) b.classList.add('active');
                    else b.classList.remove('active');
                }
            });

            if (tab === 'list' || tab === 'props' || tab === 'stock') loadData('products');
            if (tab === 'stock') loadStockLedger();
            if (tab === 'add') loadSupplierDropdown();
        }

        function adjustStockInputValue(id, diff) {
            const input = document.getElementById('stock-input-' + id);
            if (input) {
                let val = parseInt(input.value) || 0;
                val = Math.max(0, val + diff);
                input.value = val;
            }
        }

        async function saveProductStock(id) {
            const input = document.getElementById('stock-input-' + id);
            if (!input) return;
            const newStock = parseInt(input.value) || 0;
            const btn = document.getElementById('btn-save-stock-' + id);
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '...';
            }
            try {
                const p = window._cachedProducts.find(x => String(x.id) === String(id));
                if (!p) throw new Error('Produit introuvable');
                
                const is_active = newStock > 0;
                const payload = {
                    ...p,
                    stock: newStock,
                    is_active: is_active
                };
                
                await api('/products', 'POST', payload);
                showToast(t('dom_stock_mis_jour_avec', "Stock mis à jour avec succès !"), 'success');
                loadData('products');
                loadStockLedger();
            } catch (e) {
                showToast('Erreur: ' + e.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Sauvegarder';
                }
            }
        }

        async function loadStockLedger() {
            const body = document.getElementById('stock-ledger-body');
            if (!body) return;
            try {
                const logs = await api('/inventory/ledger', 'GET');
                if (!logs || logs.length === 0) {
                    body.innerHTML = `<tr><td colspan="5" style="text-align:center; opacity:0.5; padding: 20px;">Aucun mouvement de stock enregistré.</td></tr>`;
                    return;
                }
                
                body.innerHTML = logs.map(l => {
                    const dateStr = new Date(l.created_at).toLocaleString('fr-FR');
                    const prod = window._cachedProducts ? window._cachedProducts.find(p => String(p.id) === String(l.product_id)) : null;
                    const prodName = prod ? prod.name : `Produit #${l.product_id}`;
                    
                    const changeVal = parseInt(l.qty_change) || 0;
                    const changeClass = changeVal > 0 ? 'text-success' : 'text-danger';
                    const changeStr = changeVal > 0 ? `+${changeVal}` : `${changeVal}`;
                    
                    let reasonLabel = l.reason;
                    let reasonBadge = 'badge-neutral';
                    if (l.reason === 'order') {
                        reasonLabel = '📦 Vente / Commande';
                        reasonBadge = 'badge-danger';
                    } else if (l.reason === 'replenishment') {
                        reasonLabel = '📈 Réappro';
                        reasonBadge = 'badge-success';
                    } else if (l.reason === 'reservation_expiry') {
                        reasonLabel = '⏳ Expiration Réserv';
                        reasonBadge = 'badge-warning';
                    } else if (l.reason === 'manual_adjustment') {
                        reasonLabel = '🔧 Ajustement Manuel';
                        reasonBadge = 'badge-info';
                    }
                    
                    const refStr = l.reference_id ? `<code>${l.reference_id}</code>` : '—';
                    
                    return `
                        <tr>
                            <td style="font-size:13px; opacity:0.8;">${dateStr}</td>
                            <td style="font-weight:700;">${prodName}</td>
                            <td class="${changeClass}" style="font-weight:700; font-size:15px;">${changeStr}</td>
                            <td><span class="badge ${reasonBadge}" style="font-size:11px; padding:2px 8px; border-radius:12px; display:inline-block; border:1px solid currentColor;">${reasonLabel}</span></td>
                            <td style="font-size:12px;">${refStr}</td>
                        </tr>
                    `;
                }).join('');
            } catch (e) {
                console.error(e);
                body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--error); padding: 20px;">Erreur lors du chargement des logs.</td></tr>`;
            }
        }

        async function validateProposedProduct(id, btn) {
            btn.disabled = true;
            btn.innerHTML = '...';
            try {
                // Find product
                const p = window._cachedProducts.find(x => x.id === id);
                if (!p) throw new Error('Produit introuvable');
                
                await api('/products', 'POST', { ...p, is_available: true });
                showToast(t('dom_produit_valid_et_mi', "✅ Produit validé et mis en vente !"), 'success');
                loadData('products');
            } catch (e) { showToast(e.message, 'error'); btn.disabled = false; btn.innerHTML = 'VALIDER ✅'; }
        }

        // Logic for Settings Tabs
        function switchSettingsTab(tab) {
            const tabs = ['general', 'security', 'fidelity', 'payment', 'content', 'ui', 'auto', 'danger'];
            tabs.forEach(t => {
                const el = document.getElementById('sub-settings-' + t);
                if (el) el.style.display = (t === tab) ? 'block' : 'none';
                const btn = document.getElementById('btn-stab-' + t);
                if (btn) btn.classList.toggle('active', t === tab);
            });
        }

        // Logic for Livreur History
        async function showLivreurHistory(livreurId, name) {
            try {
                const history = await api(`/livreurs/${livreurId}/history`);
                const modal = document.getElementById('modalOverlay');
                const title = document.getElementById('modalTitle');
                const body = document.getElementById('modalMessage');

                title.innerText = `Historique de ${name}`;

                if (!history.length) {
                    body.innerHTML = '<p style="padding:20px; opacity:0.6;">Aucune livraison terminée.</p>';
                } else {
                    let totalVal = history.reduce((acc, o) => acc + (parseFloat(o.total_price) || 0), 0);
                    body.innerHTML = `
                        <div style="text-align:left; max-height:400px; overflow-y:auto; font-size:13px;">
                            <div style="margin-bottom:15px; background:var(--accent); color:white; padding:10px; border-radius:8px; text-align:center;">
                                <b>${history.length} livraisons | Total : ${(parseFloat(totalVal) || 0).toFixed(2)}€</b>
                            </div>
                            <table style="width:100%; border-spacing:0;">
                                <thead style="font-size:10px; color:var(--text-muted);">
                                    <tr>
                                        <th style="padding:5px;">Date</th>
                                        <th style="padding:5px;">Client</th>
                                        <th style="padding:5px;">Produit</th>
                                        <th style="padding:5px;">Prix</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(o => {
                        const d = new Date(o.created_at);
                        const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                        return `
                                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                                <td data-label="Date" style="padding:8px 5px; opacity:0.7;">${date}</td>
                                                <td data-label="Client" style="padding:8px 5px;">${o.first_name}</td>
                                                <td data-label="Produit" style="padding:8px 5px;">${o.product_name}</td>
                                                <td data-label="Prix" style="padding:8px 5px;"><b>${o.total_price}€</b></td>
                                            </tr>
                                        `;
                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                // On remplace les boutons du footer du modal pour cet usage
                const footer = document.querySelector('.modal-actions');
                const oldBtns = footer.innerHTML;
                footer.innerHTML = '<button class="btn btn-accent" onclick="closeModal(false)">Fermer</button>';

                modal.classList.add('active');

                // Restore old buttons on close
                const originalClose = window.closeModal;
                window.closeModal = (res) => {
                    modal.classList.remove('active');
                    footer.innerHTML = oldBtns;
                    window.closeModal = originalClose;
                };

            } catch (e) {
                showToast("Erreur historique: " + e.message, 'error');
            }
        }

        async function assignDriver(orderId, livreurId, livreurName) {
            if (!livreurId) return;
            try {
                await api('/orders/assign', 'POST', { orderId, livreurId, livreurName });
                showToast(t('dom_livreur_assign_avec', "Livreur assigné avec succès !"));
                loadData('orders');
            } catch (e) { showToast(e.message, 'error'); }
        }

        function addPaymentModeRow(data = {id:'', label:'', icon:''}) {
            const container = document.getElementById('payment_modes_container');
            if (!container) return;
            const div = document.createElement('div');
            div.className = 'payment-mode-row';
            div.style = "display:grid; grid-template-columns: 1fr 2fr 2fr auto; gap:10px; align-items:center; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px;";
            div.innerHTML = `
                <input class="set-pm-icon" placeholder="💰" value="${data.icon || ''}" style="text-align:center;">
                <input class="set-pm-label" placeholder="Espèces" value="${data.label || ''}">
                <input class="set-pm-id" placeholder="ID (ex: CASH)" value="${data.id || ''}" ${data.id ? 'readonly style="opacity:0.6"' : ''}>
                <button class="btn btn-sm btn-outline text-danger" onclick="this.parentElement.remove()">✕</button>
            `;
            container.appendChild(div);
        }

        // Logo Upload Logic
        async function uploadMiniAppLogo(input) {
            if (!input.files || !input.files[0]) return;
            const formData = new FormData();
            formData.append('logo', input.files[0]);
            try {
                const res = await fetch('/api/admin/upload-logo', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${TOKEN}` },
                    body: formData
                });
                const data = await res.json();
                if (data.url) {
                    showToast(t('dom_logo_mis_jour_avec_s', "Logo mis à jour avec succès !"), "success");
                    document.getElementById('dashboard_logo_preview').src = data.url + "?t=" + Date.now();
                } else {
                    showToast(data.error || "Erreur upload", "error");
                }
            } catch(e) {
                showToast(t('dom_erreur_lors_de_l_upl', "Erreur lors de l'upload du logo"), "error");
            }
        }

        async function saveSettings() {
            try {
                const getVal = (id, prop = 'value') => {
                    const el = document.getElementById(id);
                    if (!el) return prop === 'checked' ? false : '';
                    return el[prop];
                };

                const s = {
                    bot_name: getVal('set_bot_name'),
                    dashboard_title: getVal('set_title'),
                    accent_color: getVal('set_color'),
                    admin_telegram_id: Array.from(document.querySelectorAll('.admin-id-input')).map(i => i.value.trim()).filter(v => v !== '').join(', '),
                    admin_password: getVal('set_admin_password'),
                    dashboard_url: getVal('set_dashboard_url'),
                    private_contact_url: getVal('set_private_contact_url'),
                    private_contact_wa_url: getVal('set_private_contact_wa_url'),
                    channel_url: getVal('set_channel_url'),
                    custom_links: JSON.stringify(Array.from(document.querySelectorAll('.custom-link-item')).map(row => ({
                        icon: row.querySelector('.link-icon-input').value,
                        label: row.querySelector('.link-label-input').value,
                        url: row.querySelector('.link-url-input').value
                    })).filter(l => l.url.trim() !== '' || l.label.trim() !== '')),
                    points_ratio: parseFloat(getVal('set_pts_ratio')) || 1,
                    points_exchange: parseInt(getVal('set_pts_exchange')) || 100,
                    points_credit_value: parseFloat(getVal('set_pts_credit_value')) || 5,
                    ref_bonus: parseFloat(getVal('set_ref_bonus')) || 5,
                    fidelity_bonus_thresholds: getVal('set_fidelity_thresholds') || '5,10',
                    fidelity_bonus_amount: parseFloat(getVal('set_fidelity_bonus_val')) || 10,
                    fidelity_min_spend: parseFloat(getVal('set_fidelity_min_spend')) || 50,
                    languages: getVal('set_lang') || 'fr',

                    welcome_message: getVal('set_welcome_msg'),
                    payment_modes: getVal('set_payment_modes'),
                    msg_choose_qty: getVal('set_msg_qty'),

                    payment_modes_config: JSON.stringify(Array.from(document.querySelectorAll('.payment-mode-row')).map(row => ({
                        icon: row.querySelector('.set-pm-icon').value,
                        label: row.querySelector('.set-pm-label').value,
                        id: row.querySelector('.set-pm-id').value.toUpperCase().replace(/\s+/g, '_')
                    })).filter(pm => pm.id !== '')),

                    ui_icon_catalog: getVal('set_ui_icon_catalog'),
                    label_catalog: getVal('set_label_catalog'),
                    ui_icon_orders: getVal('set_ui_icon_orders'),
                    label_my_orders: getVal('set_label_my_orders'),
                    ui_icon_contact: getVal('set_ui_icon_contact'),
                    label_contact: getVal('set_label_contact'),
                    ui_icon_profile: getVal('set_ui_icon_profile'),
                    label_profile: getVal('set_label_profile'),
                    ui_icon_livreur: getVal('set_ui_icon_livreur'),
                    label_livreur_space: getVal('set_label_livreur'),
                    ui_icon_admin: getVal('set_ui_icon_admin'),
                    label_admin_bot: getVal('set_label_admin_bot'),
                    ui_icon_web: getVal('set_ui_icon_web'),
                    label_admin_web: getVal('set_label_admin_web'),
                    ui_icon_wallet: getVal('set_ui_icon_wallet'),
                    ui_icon_points: getVal('set_ui_icon_points'),
                    ui_icon_channel: getVal('set_ui_icon_channel'),
                    label_channel: getVal('set_label_channel'),
                    ui_icon_welcome: getVal('set_ui_icon_welcome'),
                    label_welcome: getVal('set_label_welcome'),

                    status_pending_label: getVal('set_status_pending_label'),
                    ui_icon_pending: getVal('set_ui_icon_pending'),
                    status_taken_label: getVal('set_status_taken_label'),
                    ui_icon_taken: getVal('set_ui_icon_taken'),
                    status_delivered_label: getVal('set_status_delivered_label'),
                    ui_icon_success: getVal('set_ui_icon_success'),
                    status_cancelled_label: getVal('set_status_cancelled_label'),
                    ui_icon_error: getVal('set_ui_icon_error'),

                    label_support: getVal('set_label_support'),
                    ui_icon_support: getVal('set_ui_icon_support'),
                    msg_help_intro: getVal('set_msg_help_intro'),

                    label_info: getVal('set_label_info'),
                    ui_icon_info: getVal('set_ui_icon_info'),
                    label_leave_review: getVal('set_label_leave_review'),
                    ui_icon_leave_review: getVal('set_ui_icon_leave_review'),
                    label_view_reviews: getVal('set_label_view_reviews'),
                    ui_icon_view_reviews: getVal('set_ui_icon_view_reviews'),
                    label_reviews: getVal('set_label_reviews'),
                    label_users: getVal('set_label_users'),
                    default_wa_name: getVal('set_default_wa_name'),

                    show_broadcasts_btn: getVal('set_show_broadcasts_btn', 'checked'),
                    show_reviews_btn: getVal('set_show_reviews_btn', 'checked'),

                    enable_abandoned_cart_notifications: getVal('set_enable_abandoned_cart_notifications', 'checked'),
                    msg_abandoned_cart: getVal('set_msg_abandoned_cart'),
                    force_subscribe: getVal('set_force_subscribe', 'checked'),
                    force_subscribe_channel_id: getVal('set_force_subscribe_channel_id'),
                    priority_delivery_enabled: getVal('set_priority_delivery_enabled', 'checked'),
                    priority_delivery_price: parseFloat(getVal('set_priority_delivery_price')) || 15,
                    auto_approve_new: getVal('set_auto_approve_new', 'checked'),
                    notify_on_approval: getVal('set_notify_on_approval', 'checked'),

                    // Toggles Plateformes & Services
                    enable_telegram: getVal('set_enable_telegram', 'checked'),
                    enable_marketplace: getVal('set_enable_marketplace', 'checked'),
                    enable_fidelity: getVal('set_enable_fidelity', 'checked'),
                    enable_referral: getVal('set_enable_referral', 'checked'),
                    enable_help_menu: getVal('set_enable_help_menu', 'checked'),

                    // Content
                    msg_order_received_admin: getVal('set_msg_order_received_admin'),
                    msg_order_confirmed_client: getVal('set_msg_order_confirmed_client'),
                    btn_livreur_space: getVal('set_btn_livreur_space'),
                    btn_back_menu: getVal('set_btn_back_menu'),
                    msg_status_taken: getVal('set_msg_status_taken'),
                    msg_status_delivered: getVal('set_msg_status_delivered'),
                    msg_delay_report: getVal('set_msg_delay_report'),
                    msg_arrival_soon: getVal('set_msg_arrival_soon'),
                    msg_review_prompt: getVal('set_msg_review_prompt'),
                    msg_review_thanks: getVal('set_msg_review_thanks'),
                    btn_leave_review: getVal('set_btn_leave_review'),
                    btn_view_reviews: getVal('set_btn_view_reviews'),
                    btn_confirm_review: getVal('set_btn_confirm_review'),
                    btn_back_menu_nav: getVal('set_btn_back_menu_nav'),
                    btn_cart_resume: getVal('set_btn_cart_resume'),
                    btn_client_mode: getVal('set_btn_client_mode'),
                    msg_thanks_participation: getVal('set_msg_thanks_participation'),
                    msg_your_answer: getVal('set_msg_your_answer')
                };

                // Ajout dynamique de tous les nouveaux champs de contenu
                const dynFields = [
                    'btn_back_generic','btn_back_quick_menu','btn_back_to_cart','btn_back_to_qty',
                    'btn_back_to_address','btn_back_to_options','btn_back_to_livreur_menu','btn_next','btn_previous',
                    'btn_clear_cart','btn_cancel_order','btn_cancel_my_order','btn_abandon_delivery',
                    'btn_send_now','btn_help_support','btn_where_is_delivery','btn_cancel','btn_cancel_alt',
                    'btn_dont_use_credit','btn_set_available','btn_notify_30min','btn_notify_10min',
                    'btn_rate_5','btn_rate_4','btn_rate_3','btn_rate_1',
                    'msg_session_expired','msg_product_not_found','msg_order_not_available','msg_order_not_found',
                    'msg_order_creation_error','msg_not_livreur','msg_access_denied',
                    'msg_catalog_empty','msg_cart_empty','msg_no_reviews_yet','msg_no_information',
                    'msg_no_active_deliveries','msg_empty_delivery_history','msg_no_active_orders',
                    'msg_cart_cleared','msg_thanks_for_feedback','msg_location_updated','msg_livreur_welcome'
                ];
                dynFields.forEach(key => {
                    const el = document.getElementById('set_' + key);
                    if (el && el.value) s[key] = el.value;
                });

                await api('/settings', 'POST', s);
                showToast(t('dom_param_tres_mis_jour', "Paramètres mis à jour !"), 'success');

                // Confirmation visuelle & Rafraîchissement direct des liens
                const clContainer = document.getElementById('custom_links_container');
                if (clContainer) {
                    clContainer.classList.remove('pulse-success');
                    void clContainer.offsetWidth; // Force reflow
                    clContainer.classList.add('pulse-success');
                    
                    const latest = await api('/settings', 'GET', null, true);
                    window.appSettings = latest;
                    renderCustomLinks(latest.custom_links);
                }

                // Correction & Feedback UI pour le mot de passe
                if (s.admin_password) {
                    setVal('set_current_password', '********');
                    function addCustomLink() {
                        addCustomLinkRow('🔗', '', '', true);
                    }
                    setVal('set_admin_password', ''); // Vider le champ après sauvegarde
                }

                // Recharger les settings depuis le serveur pour confirmation
                window.appSettings = await api('/settings', 'GET', null, true);
                updateNavbarIcons();
            } catch (err) { showToast(err.message, 'error'); }
        }

        async function toggleLivreur(platformId, platform, isLivreur) {
            try {
                await api('/livreurs/status', 'POST', { userId: platformId, platform, isLivreur });
                showToast(isLivreur ? 'Utilisateur promu livreur !' : 'Statut livreur retiré.');
                loadData('users');
                if (document.getElementById('section-livreurs').classList.contains('active')) loadData('livreurs');
            } catch (err) { showToast(err.message, 'error'); }
        }

        function addAdminRow(val = '') {
            const container = document.getElementById('admins_list_container');
            const div = document.createElement('div');
            div.style = "display:flex; gap:10px; align-items:center;";
            div.innerHTML = `
                <input class="admin-id-input" value="${val}" placeholder="ID Telegram (ex: 12345678)" style="flex:1;">
                <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:8px;">✕</button>
            `;
            container.appendChild(div);
        }

        function addCustomLinkRow(icon = '🔗', label = '', url = '', isNew = false) {
            const container = document.getElementById('custom_links_container');
            if (!container) return;
            const div = document.createElement('div');
            div.className = 'custom-link-item card' + (isNew ? ' highlight-new' : '');
            div.style = "margin-bottom:15px; padding:15px; background: rgba(255,255,255,0.02); border-radius:16px;";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:12px; flex:1;">
                        <input class="link-icon-input" value="${icon}" placeholder="Icon" style="width:40px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:10px; text-align:center; font-size:20px; padding:5px;">
                        <input class="link-label-input" value="${label}" placeholder="Label du lien (ex: Instagram)" style="flex:1; background:none; border:none; padding:5px; font-weight:700; font-size:15px; color:#fff; border-bottom:1px dashed var(--border);">
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="this.closest('.custom-link-item').remove()" style="min-width:32px; height:32px; padding:0; border-radius:10px; color:#ff453a; border-color:rgba(255, 69, 58, 0.2);">✕</button>
                </div>
                <input class="link-url-input" value="${url}" placeholder="https://..." style="width:100%; background:rgba(0,0,0,0.2); border:1px solid var(--border); padding:10px 15px; border-radius:10px; font-size:13px; font-family:monospace;">
            `;
            container.appendChild(div);

            if (isNew) {
                setTimeout(() => {
                    div.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
            }
        }

        function renderCustomLinks(links) {
            const container = document.getElementById('custom_links_container');
            if (!container) return;
            container.innerHTML = '';
            let cLinks = [];
            try {
                cLinks = typeof links === 'string' ? JSON.parse(links) : (links || []);
            } catch(e) { console.error('Parse custom_links failed', e); }
            if (cLinks && Array.isArray(cLinks)) {
                cLinks.forEach(link => addCustomLinkRow(link.icon, link.label, link.url));
            }
        }

        async function delUser(id) {
            const ok = await showModal('Supprimer', 'Supprimer cet utilisateur ?');
            if (!ok) return;
            try {
                await api('/users/delete', 'POST', { id });
                loadData('users');
                showToast(t('dom_utilisateur_supprim', "Utilisateur supprimé"), 'success');
            } catch (e) {
                showToast(e.message, 'error');
            }
        }

        function renderPaliersGrid(currentValue) {
            const grid = document.getElementById('paliers_grid');
            if (!grid) return;
            const selected = currentValue ? currentValue.split(',').map(n => n.trim()) : [];
            let html = '';
            for (let i = 1; i <= 25; i++) {
                const isSelected = selected.includes(i.toString());
                const styles = isSelected ? 'background:var(--accent); color:white; border-color:var(--accent);' : 'background:rgba(255,255,255,0.05)';
                html += `<div class="palier-chip" onclick="togglePalier(${i})" 
                             style="padding:4px 8px; border:1px solid var(--border); border-radius:6px; cursor:pointer; font-size:11px; transition:0.2s; ${styles}">
                            ${i}e
                         </div>`;
            }
            grid.innerHTML = html;
        }

        function togglePalier(n) {
            const hidden = document.getElementById('set_fidelity_thresholds');
            let vals = hidden.value ? hidden.value.split(',').map(x => x.trim()).filter(x => x) : [];
            const idx = vals.indexOf(n.toString());
            if (idx > -1) vals.splice(idx, 1);
            else vals.push(n.toString());
            vals.sort((a, b) => parseInt(a) - parseInt(b));
            hidden.value = vals.join(',');
            renderPaliersGrid(hidden.value);
        }

        async function delOrder(id) {
            const ok = await showModal('Supprimer', 'Supprimer cette commande définitivement ?');
            if (!ok) return;
            try {
                await api('/orders/' + id, 'DELETE');
                loadData('orders');
                showToast(t('dom_commande_supprim_e', "Commande supprimée"), 'success');
            } catch (e) {
                showToast(e.message, 'error');
            }
        }

        function logout() { localStorage.removeItem('admin_token'); window.location.href = '/'; }

        async function nukeEntireDatabase() {
            const confirm1 = await showModal('☢️ ZONE DE DANGER', 'Êtes-vous absolument sûr de vouloir supprimer TOUTE LA BASE DE DONNÉES ? Cette action est irréversible.');
            if (!confirm1) return;
            const confirm2 = await showModal('☢️ CONFIRMATION FINALE', 'Vous êtes sur le point de TOUT PERDRE (Produits, Commandes, Clients, Livreurs). Confirmez-vous ?');
            if (!confirm2) return;

            try {
                await api('/admin/nuke', 'POST');
                showToast(t('dom_base_de_donn_es_r_i', "✅ Base de données réinitialisée avec succès."), 'success');
                setTimeout(() => location.reload(), 2000);
            } catch (e) {
                showToast(t('dom_erreur_lors_de_la_s', "❌ Erreur lors de la suppression."), 'error');
            }
        }

        /**
         * Affiche toutes les adresses sauvegardées d'un utilisateur
         */
        async function viewUserAddresses(docId) {
            const user = window._cachedUsers.find(u => u.doc_id === docId);
            if (!user) return showToast(t('dom_client_introuvable', "Client introuvable"), "error");

            const addresses = (user.data && user.data.addresses) || [];
            if (addresses.length === 0) {
                return showModal(`📍 Adresses - ${user.first_name}`, "Aucune adresse enregistrée pour ce client.");
            }

            const html = `
                <div style="text-align:left; max-height:400px; overflow-y:auto;">
                    <p style="margin-bottom:15px; font-size:14px; color:var(--text-muted);">Voici les adresses utilisées par <b>${user.first_name}</b> :</p>
                    <ul style="list-style:none;">
                        ${addresses.map(addr => `
                            <li style="padding:12px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:12px; margin-bottom:10px; display:flex; gap:10px; align-items:start;">
                                <span style="font-size:20px;">📍</span>
                                <div>
                                    <div style="font-weight:600; font-size:14px;">${addr}</div>
                                    ${addr.toLowerCase().includes('digicode') || addr.toLowerCase().includes('infos') ? 
                                        '<small style="color:var(--accent); font-weight:bold;">🔑 Digicode/Infos inclus</small>' : ''}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;

            // Utilisation du modal personnalisé
            const modal = document.getElementById('modalOverlay');
            const title = document.getElementById('modalTitle');
            const message = document.getElementById('modalMessage');
            
            title.innerText = `📍 Adresses - ${user.first_name}`;
            message.innerHTML = html;
            
            // On cache les boutons d'action par défaut car c'est une vue info
            const footer = document.querySelector('.modal-actions');
            const oldBtns = footer.innerHTML;
            footer.innerHTML = '<button class="btn btn-accent" onclick="window.closeModalView()">Fermer</button>';

            window.closeModalView = () => {
                modal.classList.remove('active');
                footer.innerHTML = oldBtns;
            };

            modal.classList.add('active');
        }

        /**
         * Ouvre une conversation avec le client sur Telegram
         */
        function contactUser(platform, username, platformId, phone, userId) {
            if (userId) {
                switchTab('chat');
                openChatReplyModal(userId);
                return;
            }
            // Fallback (should rarely happen now)
            if (username) {
                const cleanUsername = username.replace('@', '');
                window.open(`https://t.me/${cleanUsername}`, '_blank');
            } else if (platformId) {
                const cleanId = String(platformId).replace('telegram_', '');
                window.open(`tg://user?id=${cleanId}`, '_blank');
                showToast(t('dom_ouverture_telegram_d', "Ouverture Telegram directe..."), "info");
            } else {
                showToast(t('dom_identifiant_telegram', "Identifiant Telegram introuvable"), "error");
            }
        }

        // --- PREMIUM TIMING LOGIC (Popover + Custom Selection) ---
        let selectedDates = { start: null, end: null };
        let selectedTimes = { start: null, end: null };

        function initCustomTimers() {
            const now = new Date();
            const days = [];
            for (let i = 0; i < 14; i++) {
                const date = new Date(now);
                date.setDate(now.getDate() + i);
                days.push(date);
            }

            const hours = [];
            for (let i = 0; i < 24; i++) {
                hours.push(`${i.toString().padStart(2, '0')}:00`);
                hours.push(`${i.toString().padStart(2, '0')}:30`);
            }

            const renderDates = (type) => {
                const container = document.getElementById(`${type}-date-carousel`);
                if (!container) return;
                container.innerHTML = days.map(d => `
                    <div class="mini-date-card" onclick="event.stopPropagation(); selectCustomDate('${type}', '${d.toISOString()}', this)">
                        <div class="day-name">${d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                        <div class="day-num">${d.getDate()}</div>
                        <div class="month">${d.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                    </div>
                `).join('');
            };

            const renderTimes = (type) => {
                const container = document.getElementById(`${type}-time-carousel`);
                if (!container) return;
                container.innerHTML = hours.map(h => `
                    <div class="mini-time-chip" onclick="event.stopPropagation(); selectCustomTime('${type}', '${h}', this)">${h}</div>
                `).join('');
            };

            ['start', 'end'].forEach(type => { renderDates(type); renderTimes(type); });

            // Auto close on click outside
            document.addEventListener('click', () => {
                document.querySelectorAll('.timing-popover').forEach(p => p.classList.remove('open'));
            });
        }

        function toggleTimingPopover(type) {
            const p = document.getElementById(`popover-${type}`);
            const other = document.getElementById(type === 'start' ? 'popover-end' : 'popover-start');
            other.classList.remove('open');
            p.classList.toggle('open');
        }

        function selectCustomDate(type, dateStr, el) {
            el.parentElement.querySelectorAll('.mini-date-card').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
            selectedDates[type] = new Date(dateStr);
            updateFinalTiming(type);
        }

        function selectCustomTime(type, timeStr, el) {
            el.parentElement.querySelectorAll('.mini-time-chip').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
            selectedTimes[type] = timeStr;
            updateFinalTiming(type);
        }

        function updateFinalTiming(type) {
            const date = selectedDates[type];
            if (!date) return;
            const [h, m] = (selectedTimes[type] || "00:00").split(':');
            const final = new Date(date);
            final.setHours(parseInt(h), parseInt(m), 0);

            document.getElementById(type === 'start' ? 'bcStart' : 'bcEnd').value = final.toISOString();

            const display = document.getElementById(type === 'start' ? 'displayStart' : 'displayEnd');
            display.innerText = final.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            document.getElementById(`btn-${type}`).classList.add('active');
        }

        function resetTiming(type) {
            selectedDates[type] = null;
            selectedTimes[type] = null;
            document.getElementById(type === 'start' ? 'bcStart' : 'bcEnd').value = '';
            document.getElementById(`btn-${type}`).classList.remove('active');
            document.getElementById(type === 'start' ? 'displayStart' : 'displayEnd').innerText = type === 'start' ? 'Maintenant (Immédiat)' : 'Indéfinie (Reste affiché)';

            const p = document.getElementById(`popover-${type}`);
            p.querySelectorAll('.mini-date-card, .mini-time-chip').forEach(el => el.classList.remove('active'));
        }

        // Init — afficher la section active

        let suppliersData = [];

        async function loadSuppliers() {
            try {
                suppliersData = await api('/suppliers', 'GET', null, true) || [];
                renderSuppliers();
            } catch(e) { console.error('loadSuppliers error:', e); }
        }

        function renderSuppliers() {
            const el = document.getElementById('suppliersList');
            if (!suppliersData.length) {
                el.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Aucun fournisseur. Cliquez sur "Ajouter" pour en créer un.</p>';
                return;
            }
            el.innerHTML = suppliersData.map(s => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border); flex-wrap:wrap; gap:8px;">
                    <div>
                        <b>${s.name}</b> ${s.is_active ? '<span style="color:green;">✅</span>' : '<span style="color:red;">❌</span>'}
                        <div style="font-size:12px; color:var(--text-muted);">
                            ${s.phone || ''} ${s.telegram_id ? '| TG: '+s.telegram_id : ''} ${s.commission_pct ? '| Commission: '+s.commission_pct+'%' : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn btn-sm btn-outline" onclick="editSupplier('${s.id}')">✏️</button>
                        <button class="btn btn-sm btn-outline" style="color:red;" onclick="deleteSupplierUI('${s.id}')">🗑</button>
                    </div>
                </div>
            `).join('');
        }

        function openSupplierForm() {
            document.getElementById('supplierFormCard').style.display = 'block';
            document.getElementById('supplierFormTitle').textContent = '➕ Nouveau Fournisseur';
            document.getElementById('supplierId').value = '';
            document.getElementById('supplierName').value = '';
            document.getElementById('supplierPhone').value = '';
            document.getElementById('supplierTelegramId').value = '';
            document.getElementById('supplierPlatform').value = 'telegram';
            document.getElementById('supplierCommission').value = '';
            document.getElementById('supplierActive').value = 'true';
            document.getElementById('supplierDeliveryMode').value = 'admin';
            document.getElementById('supplierNotes').value = '';
        }

        function closeSupplierForm() {
            document.getElementById('supplierFormCard').style.display = 'none';
        }

        function editSupplier(id) {
            const s = suppliersData.find(x => x.id === id);
            if (!s) return;
            document.getElementById('supplierFormCard').style.display = 'block';
            document.getElementById('supplierFormTitle').textContent = '✏️ Modifier: ' + s.name;
            document.getElementById('supplierId').value = s.id;
            document.getElementById('supplierName').value = s.name || '';
            document.getElementById('supplierPhone').value = s.phone || '';
            document.getElementById('supplierTelegramId').value = s.telegram_id || '';
            document.getElementById('supplierPlatform').value = s.platform || 'telegram';
            document.getElementById('supplierCommission').value = s.commission_pct || '';
            document.getElementById('supplierActive').value = s.is_active ? 'true' : 'false';
            
            // Extraction du mode de livraison des notes
            let notes = s.notes || '';
            let mode = 'admin';
            if (notes.includes('DELIVERY_MODE:supplier')) {
                mode = 'supplier';
                notes = notes.replace('||| DELIVERY_MODE:supplier', '').trim();
            } else {
                notes = notes.replace('||| DELIVERY_MODE:admin', '').trim();
            }
            
            document.getElementById('supplierDeliveryMode').value = mode;
            document.getElementById('supplierNotes').value = notes;
        }

        async function saveSupplier() {
            const data = {
                name: document.getElementById('supplierName').value.trim(),
                phone: document.getElementById('supplierPhone').value.trim(),
                telegram_id: document.getElementById('supplierTelegramId').value.trim(),
                platform: document.getElementById('supplierPlatform').value,
                commission_pct: parseFloat(document.getElementById('supplierCommission').value) || 0,
                is_active: document.getElementById('supplierActive').value === 'true',
                notes: document.getElementById('supplierNotes').value.trim() + ' ||| DELIVERY_MODE:' + document.getElementById('supplierDeliveryMode').value
            };
            if (!data.name) return alert(t('dom_le_nom_est_obligatoi', "Le nom est obligatoire"));
            const id = document.getElementById('supplierId').value;
            if (id) data.id = id;

            try {
                await api('/suppliers', 'POST', data, true);
                closeSupplierForm();
                await loadSuppliers();
                await loadSupplierDropdown();
            } catch(e) { alert('Erreur: ' + e.message); }
        }

        async function deleteSupplierUI(id) {
            if (!confirm('Supprimer ce fournisseur ?')) return;
            try {
                await api('/suppliers/' + id, 'DELETE', null, true);
                await loadSuppliers();
                await loadSupplierDropdown();
            } catch(e) { alert('Erreur: ' + e.message); }
        }

        async function promoteToSupplier(platformId, platform, name) {
            try {
                const suppliers = await api('/suppliers', 'GET', null, true) || [];
                const existing = suppliers.find(s => s.telegram_id === String(platformId));
                if (existing) {
                    showToast(t('dom_cet_utilisateur_est', "Cet utilisateur est déjà fournisseur !"), 'info');
                    switchSection('suppliers');
                    return;
                }
            } catch(e) {}

            if (!confirm(`Promouvoir "${name}" en fournisseur ?`)) return;

            try {
                await api('/suppliers', 'POST', {
                    name: name || 'Fournisseur',
                    telegram_id: String(platformId),
                    platform: platform || 'telegram',
                    is_active: true,
                    commission_pct: 0,
                    notes: 'Promu depuis la liste utilisateurs'
                }, true);
                showToast(t('dom_name_est_maintenant', "✅ ' + name + ' est maintenant fournisseur !"), 'success');
                switchSection('suppliers');
            } catch(e) { showToast('Erreur: ' + e.message, 'error'); }
        }
        // ========== MARKETPLACE FUNCTIONS ==========
        let mpProductsData = [];
        let mpOrdersData = [];
        let currentSupplierTab = 'list';

        function switchSupplierTab(tab) {
            currentSupplierTab = tab;

            // Elements for each tab
            const listEls = ['supplierFormCard', 'supplierListCard', 'supplierGuideCard'];
            const mpTab = document.getElementById('marketplaceTab');
            const mpOrdersTab = document.getElementById('mpOrdersTab');

            // Hide all
            listEls.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
            if (mpTab) mpTab.style.display = 'none';
            if (mpOrdersTab) mpOrdersTab.style.display = 'none';

            // Show selected
            if (tab === 'list') listEls.forEach(id => { const el = document.getElementById(id); if (el && id !== 'supplierFormCard') el.style.display = ''; });
            if (tab === 'marketplace' && mpTab) mpTab.style.display = '';
            if (tab === 'mpOrders' && mpOrdersTab) mpOrdersTab.style.display = '';

            // Update tab button styles
            ['tabBtnList', 'tabBtnMarketplace', 'tabBtnMpOrders'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.style.fontWeight = '400';
                    btn.style.background = 'transparent';
                }
            });
            const activeBtn = { list: 'tabBtnList', marketplace: 'tabBtnMarketplace', mpOrders: 'tabBtnMpOrders' }[tab];
            const activeBtnEl = document.getElementById(activeBtn);
            if (activeBtnEl) { activeBtnEl.style.fontWeight = '600'; activeBtnEl.style.background = 'rgba(106,90,205,0.15)'; }

            // Load data
            if (tab === 'marketplace') loadMarketplaceProducts();
            if (tab === 'mpOrders') loadMarketplaceOrders();
        }

        async function loadMarketplaceProducts() {
            const filterSupplier = document.getElementById('mpFilterSupplier')?.value || '';
            const filterVal = document.getElementById('mpFilterValidation')?.value || 'all';
            let url = (filterSupplier && filterSupplier !== 'all') ? `/marketplace/products?supplier_id=${filterSupplier}` : '/marketplace/products';
            
            console.log('[Marketplace] Fetching:', url);
            try {
                const res = await api(url, 'GET', null, true);
                const data = res || [];
                console.log('[Marketplace] Raw data received:', data.length);
                
                // Keep all data by default, filter only if column exists and requested
                let filtered = data;
                if (filterVal === 'validated') {
                    filtered = data.filter(p => p.is_validated !== false);
                } else if (filterVal === 'pending') {
                    filtered = data.filter(p => p.is_validated === false);
                }
                
                mpProductsData = filtered;
                console.log('[Marketplace] Final count rendered:', mpProductsData.length);
                
                const countBadge = document.getElementById('mpProductCount');
                if (countBadge) countBadge.textContent = `${mpProductsData.length} produit(s)`;
                
                renderMarketplaceProducts();
                
                const select = document.getElementById('mpFilterSupplier');
                if (select && select.options.length <= 1) {
                    const suppliers = await api('/suppliers', 'GET', null, true) || [];
                    suppliers.forEach(s => {
                        if (!Array.from(select.options).find(o => o.value === s.id)) {
                            const opt = document.createElement('option');
                            opt.value = s.id; opt.textContent = s.name;
                            select.appendChild(opt);
                        }
                    });
                }
            } catch(e) { 
                console.error('[Marketplace] Load error:', e);
                const grid = document.getElementById('mpProductsGrid');
                if (grid) grid.innerHTML = `<div class="card" style="text-align:center; padding:20px; color:var(--accent);">⚠️ ERREUR : ${e.message}</div>`;
                alert('Erreur Marketplace: ' + e.message);
            }
        }

        function renderMarketplaceProducts() {
            const grid = document.getElementById('mpProductsGrid');
            const countEl = document.getElementById('mpProductCount');
            if (!grid) return;

            if (countEl) countEl.textContent = `${mpProductsData.length} produit(s)`;

            if (mpProductsData.length === 0) {
                grid.innerHTML = '<div class="card" style="grid-column:1/-1; text-align:center; padding:40px;"><p style="color:var(--text-muted);">📭 Aucun produit marketplace.<br><small>Les fournisseurs peuvent ajouter des produits via le bot Telegram.</small></p></div>';
                return;
            }

            grid.innerHTML = mpProductsData.map(p => {
                const statusColor = p.is_available && p.stock > 0 ? '#27ae60' : '#e74c3c';
                const statusText = p.is_available && p.stock > 0 ? 'En vente' : 'Indisponible';
                const imgHtml = p.image_url ? `<img src="${p.image_url}" style="width:100%; height:140px; object-fit:cover; border-radius:8px 8px 0 0;" onerror="this.style.display='none'">` : `<div style="height:80px; background:linear-gradient(135deg, #6a5acd22, #9370db22); border-radius:8px 8px 0 0; display:flex; align-items:center; justify-content:center; font-size:32px;">📦</div>`;
                
                const valBadge = p.is_validated ? 
                    `<span style="background:rgba(39,174,96,0.1); color:#27ae60; padding:2px 6px; border-radius:4px; font-size:9px;">VALIDÉ ✅</span>` : 
                    `<span style="background:rgba(230,126,34,0.1); color:#e67e22; padding:2px 6px; border-radius:4px; font-size:9px;">EN ATTENTE 🛑</span>`;

                return `
                    <div class="card" style="padding:0; overflow:hidden; border: 1px solid ${p.is_validated ? 'transparent' : 'rgba(230,126,34,0.3)'};">
                        ${imgHtml}
                        <div style="padding:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:start;">
                                <h4 style="margin:0 0 4px;">${p.name}</h4>
                                <span style="background:${statusColor}22; color:${statusColor}; padding:2px 8px; border-radius:10px; font-size:11px; white-space:nowrap;">${statusText}</span>
                            </div>
                            <div style="font-size:22px; font-weight:700; color:var(--accent); margin:6px 0;">${p.price}€</div>
                            <div style="display:flex; gap:8px; font-size:12px; color:var(--text-muted); margin-bottom:6px;">
                                <span>📦 Stock: <b>${p.stock || 0}</b></span>
                                ${p.category ? '<span>🏷 ' + p.category + '</span>' : ''}
                            </div>
                            ${p.description ? '<p style="font-size:12px; color:var(--text-muted); margin:4px 0 8px;">' + p.description.substring(0, 80) + '</p>' : ''}
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                                <div class="mp-qty-selector" style="display:flex; border:1px solid var(--border); border-radius:10px; overflow:hidden; background: rgba(255,255,255,0.05);">
                                    <button class="btn btn-sm" style="background:none; border:none; border-radius:0; width:30px; padding:0; color:#fff; font-size:18px; line-height:1;" onclick="const inp=document.getElementById('qty-mp-${p.id}'); if(inp.value>1)inp.value--;">-</button>
                                    <input type="number" value="1" min="1" id="qty-mp-${p.id}" 
                                        style="width:40px; text-align:center; background:none; border:none; color:#fff !important; font-size:16px; font-weight:800; padding:4px 0; margin:0;"
                                        oninput="if(this.value<1)this.value=1;">
                                    <button class="btn btn-sm" style="background:none; border:none; border-radius:0; width:30px; padding:0; color:#fff; font-size:18px; line-height:1;" onclick="const inp=document.getElementById('qty-mp-${p.id}'); inp.value++;">+</button>
                                </div>
                                <button class="btn btn-sm btn-accent" onclick="addWithQty('${p.id}')" style="flex:1; border-radius:10px; height: 36px; font-weight: 700;">🛒 Ajouter</button>
                            </div>
                            <div style="display:flex; gap:6px; margin-top:8px;">
                                <button class="btn btn-sm btn-outline" style="flex:1;" onclick="editMpProduct('${p.id}')">✏️ Edit</button>
                                <button class="btn btn-sm btn-outline" style="flex:1; border-color:var(--accent); color:var(--accent);" onclick="promoteMpProduct('${p.id}')">✨ Publier au Catalogue Client</button>
                                <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="deleteMpProduct('${p.id}')">🗑</button>
                            </div>
                        </div>
                    </div>`;
            }).join('');
        }

        async function promoteMpProduct(id) {
            const ok = await showConfirmModal("Promotion Boutique", "Voulez-vous mettre ce produit en vente dans le Catalogue Client (Vente au détail) ?\n\nLe produit sera transféré du Marché (Gros) vers la boutique publique.");
            if (!ok) return;
            try {
                const res = await api(`/marketplace/products/${id}/transfer`, 'POST');
                showToast(t('dom_produit_transf_r_av', "✅ Produit transféré avec succès au catalogue !"), 'success');
                loadMarketplaceProducts();
            } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
        }

        async function editMpProduct(id) {
            const p = mpProductsData.find(x => x.id === id);
            if (!p) return;
            await showFormModal("Édition Rapide", [
                { label: "Nouveau prix (€)", id: "price", type: "number", value: p.price },
                { label: "Nouveau stock", id: "stock", type: "number", value: p.stock }
            ], async (vals) => {
                await api('/marketplace/products', 'POST', {
                    id: p.id,
                    price: parseFloat(vals.price) || p.price,
                    stock: parseInt(vals.stock) || p.stock,
                    is_available: parseInt(vals.stock) > 0
                }, true);
                showToast(t('dom_produit_mis_jour', "✅ Produit mis à jour"), 'success');
                loadMarketplaceProducts();
            });
        }

        async function deleteMpProduct(id) {
            const ok = await showConfirmModal("Suppression", "Supprimer ce produit marketplace ?");
            if (!ok) return;
            try {
                await api('/marketplace/products/' + id, 'DELETE', null, true);
                showToast(t('dom_produit_supprim', "🗑 Produit supprimé"), 'success');
                loadMarketplaceProducts();
            } catch (e) { showToast('Erreur: ' + e.message, 'error'); }
        }

        async function loadMarketplaceOrders() {
            try {
                mpOrdersData = await api('/marketplace/orders', 'GET', null, true) || [];
                renderMarketplaceOrders();
            } catch(e) { console.error('loadMarketplaceOrders:', e); }
        }

        function renderMarketplaceOrders() {
            const el = document.getElementById('mpOrdersList');
            if (!el) return;

            if (mpOrdersData.length === 0) {
                el.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">📭 Aucune commande marketplace.</p>';
                return;
            }

            el.innerHTML = `<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse;">
                <thead><tr style="border-bottom:2px solid var(--border); text-align:left;">
                    <th style="padding:8px;">ID</th>
                    <th style="padding:8px;">Fournisseur</th>
                    <th style="padding:8px;">Produits</th>
                    <th style="padding:8px;">Total</th>
                    <th style="padding:8px;">Statut</th>
                    <th style="padding:8px;">Date</th>
                    <th style="padding:8px;">Actions</th>
                </tr></thead>
                <tbody>${mpOrdersData.map(o => {
                    const statusColors = { pending: '#f39c12', accepted: '#3498db', ready: '#27ae60', collected: '#95a5a6', cancelled: '#e74c3c' };
                    const statusLabels = { pending: '⏳ En attente', accepted: '✅ Acceptée', ready: '📦 Prête', collected: '🏁 Récupérée', cancelled: '❌ Annulée' };
                    const items = Array.isArray(o.products) ? o.products.map(p => p.name + ' x' + p.qty).join(', ') : 'N/A';
                    const date = o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
                    return '<tr style="border-bottom:1px solid var(--border);">' +
                        '<td style="padding:8px; font-family:monospace;">#' + o.id.slice(-6) + '</td>' +
                        '<td style="padding:8px;">' + (o.supplier_name || o.supplier_id?.slice(0,8) || '?') + '</td>' +
                        '<td style="padding:8px; font-size:12px;">' + items + '</td>' +
                        '<td style="padding:8px; font-weight:600;">' + o.total_price + '€</td>' +
                        '<td style="padding:8px;"><span style="background:' + (statusColors[o.status]||'#999') + '22; color:' + (statusColors[o.status]||'#999') + '; padding:2px 8px; border-radius:10px; font-size:11px;">' + (statusLabels[o.status] || o.status) + '</span></td>' +
                        '<td style="padding:8px; font-size:12px;">' + date + '</td>' +
                        '<td style="padding:8px; display:flex; gap:4px;">' + 
                            (o.status === 'ready' ? '<button class="btn btn-sm" style="background:#27ae60; color:#fff; border:none;" onclick="updateMarketplaceStatus(\'' + o.id + '\', \'collected\')">🏁 Récupérée</button>' : '') + 
                            (o.status === 'pending' || o.status === 'accepted' ? '<button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="updateMarketplaceStatus(\'' + o.id + '\', \'cancelled\')">🗑 Annuler</button>' : '') +
                        '</td>' +
                    '</tr>';
                }).join('')}</tbody></table></div>`;
        }

        async function updateMarketplaceStatus(orderId, status) {
            if (status === 'cancelled' && !confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;
            try {
                await api('/marketplace/orders/' + orderId + '/status', 'POST', { status }, true);
                const labels = { collected: 'récupérée', cancelled: 'annulée' };
                showToast(`✅ Commande ${labels[status] || status} !`, 'success');
                loadMarketplaceOrders();
            } catch(e) { showToast('Erreur: ' + e.message, 'error'); }
        }
        // Panier Marketplace Logic
        let mpCart = [];
        function toggleMpCart() {
            const drawer = document.getElementById('mpCartDrawer');
            if (drawer) {
                drawer.style.display = (drawer.style.display === 'none' || drawer.style.display === '') ? 'flex' : 'none';
            }
        }

        function addWithQty(productId) {
            const qty = parseInt(document.getElementById('qty-mp-'+productId).value) || 1;
            for(let i=0; i<qty; i++) addMarketplaceToCart(productId);
            // reset quantity input
            document.getElementById('qty-mp-'+productId).value = 1;
        }

        function addMarketplaceToCart(productId) {
            const p = mpProductsData.find(x => x.id === productId);
            if (!p) return;
            const existing = mpCart.find(x => x.id === productId);
            if (existing) {
                existing.qty++;
            } else {
                mpCart.push({ ...p, qty: 1 });
            }
            renderMpCart();
            showToast(`✅ ${p.name} ajouté`, 'success');
        }

        function renderMpCart() {
            const listEl = document.getElementById('mpCartItems');
            const badge = document.getElementById('mpCartBadge');
            if (!listEl) return;

            if (mpCart.length === 0) {
                listEl.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:100px;">Panier vide 📭</p>';
                if (badge) badge.style.display = 'none';
                document.getElementById('mpCartTotal').innerText = '0.00€';
                return;
            }

            if (badge) {
                badge.style.display = 'flex';
                badge.innerText = mpCart.reduce((a, b) => a + b.qty, 0);
            }

            let total = 0;
            listEl.innerHTML = mpCart.map((it, idx) => {
                total += it.price * it.qty;
                return `
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; padding:10px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid var(--border);">
                        ${it.image_url ? `<img src="${it.image_url}" style="width:40px; height:40px; object-fit:cover; border-radius:8px;">` : `<div style="width:40px; height:40px; background:var(--border); border-radius:8px; display:flex; align-items:center; justify-content:center;">📦</div>`}
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:700; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${it.name}</div>
                            <div style="font-size:12px; color:var(--accent);">${it.price}€</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button class="btn btn-sm btn-outline" style="padding:0; width:24px; height:24px;" onclick="updateMpCartQty(${idx}, -1)">-</button>
                            <span style="font-weight:bold; font-size:13px;">${it.qty}</span>
                            <button class="btn btn-sm btn-outline" style="padding:0; width:24px; height:24px;" onclick="updateMpCartQty(${idx}, 1)">+</button>
                        </div>
                    </div>`;
            }).join('');
            document.getElementById('mpCartTotal').innerText = `${(parseFloat(total) || 0).toFixed(2)}€`;
        }

        function updateMpCartQty(idx, delta) {
            if (!mpCart[idx]) return;
            mpCart[idx].qty += delta;
            if (mpCart[idx].qty <= 0) mpCart.splice(idx, 1);
            renderMpCart();
        }

        async function checkoutMarketplace() {
            if (mpCart.length === 0) return showToast(t('dom_panier_vide', "Panier vide !"), 'error');
            
            // Group elements by supplier
            const orders = {};
            mpCart.forEach(it => {
                if (!orders[it.supplier_id]) orders[it.supplier_id] = [];
                orders[it.supplier_id].push(it);
            });

            const address = document.getElementById('mpOrderAddress').value;
            const deliveryType = document.getElementById('mpOrderDeliveryType').value;

            if (deliveryType === 'delivery' && !address) {
                return showToast(t('dom_veuillez_entrer_une', "Veuillez entrer une adresse de livraison !"), 'error');
            }

            if (!confirm(`Passer ${Object.keys(orders).length} commande(s) aux fournisseurs ?`)) return;

            try {
                for (const supplierId in orders) {
                    const products = orders[supplierId].map(it => ({
                        id: it.id,
                        name: it.name,
                        price: it.price,
                        qty: it.qty,
                        image_url: it.image_url
                    }));
                    const totalPrice = products.reduce((a, b) => a + (b.price * b.qty), 0);
                    
                    await api('/marketplace/orders', 'POST', {
                        supplier_id: supplierId,
                        products: products,
                        total_price: totalPrice,
                        address: address,
                        delivery_type: deliveryType
                    }, true);
                }
                
                showToast(t('dom_commandes_envoy_es', "🚀 Commandes envoyées !"), 'success');
                document.getElementById('mpOrderAddress').value = '';
                mpCart = [];
                renderMpCart();
                toggleMpCart();
                switchSupplierTab('mpOrders');
            } catch(e) {
                showToast('Erreur: ' + e.message, 'error');
            }
        }
        // ========== FIN MARKETPLACE FUNCTIONS ==========

        (async () => {
            const authed = await checkAuthAndRedirect();
            if (!authed) return;

            initCustomTimers();
            const initSection = location.hash.replace('#', '') || 'overview';
            
            // 1. Initial essential data
            try {
                const [settings, stats] = await Promise.all([
                    api('/settings', 'GET', null, false),
                    api('/stats', 'GET', null, false)
                ]);
                window.appSettings = settings;
                window.appStats = stats;
                _loadedSections['settings'] = true;

                // Mise à jour immédiate des compteurs dès le chargement
                if (stats) {
                    const el = document.getElementById('usersTotalCounter');
                    if (el) el.innerText = (stats.totalUsers || 0) + ' clients';
                    const elB = document.getElementById('usersBlockedCounter');
                    if (elB) elB.innerText = 'Bloqués: ' + (stats.totalBlocked || 0);
                    const elL = document.getElementById('livreursTotalCounter');
                    if (elL) elL.innerText = (stats.totalLivreurs || 0) + ' livreurs';
                    
                    // Trigger full stat update for internal IDs
                    updatePlatformStats();
                }
            } catch (err) { console.warn("Initial data load failed", err); }

            // 2. Main section load
            await switchSection(initSection);

            // 3. Sequential preload (one by one, avoiding server pressure)
            const allSections = ['users', 'products', 'logistique', 'broadcast', 'insights'];
            const toPreload = allSections.filter(s => s !== initSection);
            
            for (const s of toPreload) {
                if (_loadedSections[s]) continue;
                // Preload in the background with a small delay between each
                setTimeout(async () => {
                    try {
                        await loadData(s, true);
                        _loadedSections[s] = true;
                    } catch (e) { }
                }, 100);
            }
        })();
        // ═══════════════════════════════════════════════════════════
        // ADMIN SUPPORT CHAT FUNCTIONS
        // ═══════════════════════════════════════════════════════════
        let _chatSearchTimeout = null;
        async function filterAdminChats() {
            const list = document.getElementById('admin-chat-list');
            const q = document.getElementById('chat-search-input').value.toLowerCase().trim();
            let chats = window._adminChatsData || [];

            if (q.length >= 2) {
                clearTimeout(_chatSearchTimeout);
                await new Promise(resolve => {
                    _chatSearchTimeout = setTimeout(async () => {
                        try {
                            const results = await api('/admin-chat/search?q=' + encodeURIComponent(q), 'GET', null, true);
                            if (results && results.length > 0) {
                                results.forEach(r => {
                                    if (!chats.find(c => c.userId === r.userId)) {
                                        chats.push({
                                            userId: r.userId,
                                            username: r.username,
                                            first_name: r.first_name,
                                            platform_id: r.platform_id,
                                            lastMessage: null,
                                            unreadCount: 0,
                                            messages: []
                                        });
                                    }
                                });
                            }
                        } catch(e) {}
                        resolve();
                    }, 400);
                });
            }

            const cleanQ = q.replace(/[@#]/g, '');
            const filtered = chats.filter(c => {
                const searchStr = `${c.username || ''} ${c.first_name || ''} ${c.platform_id || ''}`.toLowerCase();
                return searchStr.includes(cleanQ);
            });

            document.getElementById('chat-count-label').innerText = `${filtered.length} conversation(s)`;

            let unreadTotal = 0;
            if (filtered.length === 0) {
                list.innerHTML = `<div style="text-align:center; opacity:0.4; padding:40px;">Aucune conversation trouvée.</div>`;
            } else {
                list.innerHTML = filtered.map(c => {
                    unreadTotal += (c.unreadCount || 0);
                    const lastMsg = c.lastMessage ? c.lastMessage.text : 'Nouvelle conversation...';
                    const lastTs = c.lastMessage ? new Date(c.lastMessage.ts).toLocaleString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
                    return `
                    <div class="card" style="padding:15px 20px; cursor:pointer; margin-bottom:0; display:flex; justify-content:space-between; align-items:center;" onclick="openChatReplyModal('${c.userId}')">
                        <div style="display:flex; flex-direction:column; gap:4px; max-width:70%;">
                            <div style="font-weight:700; font-size:15px;">${c.first_name} <span style="opacity:0.5; font-size:12px; font-weight:400;">${c.username ? '@'+c.username : 'ID:'+c.platform_id}</span></div>
                            <div style="font-size:13px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${lastMsg}</div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                            <div style="font-size:11px; opacity:0.6; font-weight:700;">${lastTs}</div>
                            ${c.unreadCount > 0 ? `<div style="background:var(--accent); color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:10px;">${c.unreadCount} NEW</div>` : ''}
                        </div>
                    </div>
                    `;
                }).join('');
            }

            const unreadDot = document.getElementById('chat-unread-dot');
            if (unreadDot) {
                unreadDot.style.display = unreadTotal > 0 ? 'block' : 'none';
            }
        }

        window._currentReplyUserId = null;
        async function openChatReplyModal(userId) {
            window._currentReplyUserId = userId;
            let chat = (window._adminChatsData || []).find(c => c.userId === userId);
            
            // Si on ouvre une conversation, on va chercher l'historique complet pour être sûr
            try {
                const res = await api('/admin-chat/history?userId=' + userId, 'GET', null, true);
                if (res && res.messages) {
                    if (chat) {
                        chat.messages = res.messages;
                        chat.lastMessage = res.messages[res.messages.length - 1] || null;
                    } else {
                        // Si le chat n'existait pas du tout (ex: via un bouton contact sur une commande)
                        chat = { userId, first_name: 'Utilisateur', messages: res.messages, unreadCount: 0 };
                        window._adminChatsData = window._adminChatsData || [];
                        window._adminChatsData.push(chat);
                    }
                }
            } catch (e) {
                console.error("Erreur chargement historique:", e);
            }
            
            if (!chat) return;

            document.getElementById('chat-reply-header').innerText = `Chat - ${chat.first_name}`;
            const msgContainer = document.getElementById('chat-reply-messages');
            
            if (!chat.messages || chat.messages.length === 0) {
                msgContainer.innerHTML = '<div style="text-align:center; opacity:0.5; padding:20px;">Aucun message.</div>';
            } else {
                msgContainer.innerHTML = chat.messages.map(m => {
                    const isAdmin = m.role === 'admin';
                    const isSystem = m.role === 'system';
                    const isLivreur = m.role === 'livreur';
                    const isClient = m.role === 'client';
                    const time = new Date(m.ts).toLocaleString('fr-FR', {hour:'2-digit', minute:'2-digit'});
                    
                    if (isSystem) {
                        return `
                        <div style="display:flex; justify-content:center; margin-bottom:8px;">
                            <div style="background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6); padding:4px 10px; border-radius:10px; font-size:11px; text-align:center; max-width:85%;">
                                ${m.text}
                                <div style="font-size:9px; opacity:0.5; margin-top:2px;">${time}</div>
                            </div>
                        </div>
                        `;
                    }
                    
                    if (isLivreur) {
                        return `
                        <div style="display:flex; flex-direction:column; align-items:flex-start; margin-bottom:8px;">
                            <div style="background:rgba(255,165,0,0.15); border:1px solid rgba(255,165,0,0.3); color:#fff; padding:10px 14px; border-radius:18px 18px 18px 4px; max-width:85%; font-size:14px; line-height:1.4; word-break:break-word;">
                                <div style="font-size:10px; font-weight:900; color:orange; margin-bottom:4px;">🚴 LIVREUR</div>
                                ${m.text}
                            </div>
                            <div style="font-size:10px; opacity:0.4; margin-top:3px; padding:0 5px;">${time}</div>
                        </div>
                        `;
                    }

                    return `
                    <div style="display:flex; flex-direction:column; align-items:${isAdmin ? 'flex-end' : 'flex-start'}; margin-bottom:8px;">
                        <div style="background:${isAdmin ? 'linear-gradient(135deg,#0096ff,#0050cc)' : 'rgba(255,255,255,0.08)'}; color:#fff; padding:10px 14px; border-radius:18px; max-width:85%; font-size:14px; line-height:1.4; word-break:break-word;">
                            ${isClient && m.target === 'livreur' ? '<div style="font-size:10px; font-weight:900; color:rgba(255,255,255,0.5); margin-bottom:4px;">Au livreur :</div>' : ''}
                            ${m.text}
                        </div>
                        <div style="font-size:10px; opacity:0.4; margin-top:3px; padding:0 5px;">${time}</div>
                    </div>
                    `;
                }).join('');
            }

            document.getElementById('chat-reply-modal').style.display = 'flex';
            msgContainer.scrollTop = msgContainer.scrollHeight;
            setTimeout(() => document.getElementById('chat-reply-input').focus(), 100);
        }

        function closeChatReplyModal() {
            document.getElementById('chat-reply-modal').style.display = 'none';
            window._currentReplyUserId = null;
        }

        async function sendAdminReply() {
            if (!window._currentReplyUserId) return;
            const input = document.getElementById('chat-reply-input');
            const text = input.value.trim();
            if (!text) return;

            try {
                input.disabled = true;
                const adminName = "Support"; // Could be dynamically fetched
                await api('/admin-chat/reply', 'POST', {
                    targetUserId: window._currentReplyUserId,
                    text: text,
                    adminName: adminName
                });
                input.value = '';
                showToast(t('dom_r_ponse_envoy_e', "Réponse envoyée"));
                
                // Optimistic UI update
                const chat = window._adminChatsData.find(c => c.userId === window._currentReplyUserId);
                if (chat) {
                    chat.messages.push({ role: 'admin', text: text, ts: Date.now(), from: adminName });
                    chat.lastMessage = chat.messages[chat.messages.length - 1];
                    chat.unreadCount = 0; // mark as read locally
                    openChatReplyModal(window._currentReplyUserId); // re-render modal
                    filterAdminChats(); // update list
                }
            } catch (e) {
                showToast(t('dom_erreur_envoi_r_ponse', "Erreur envoi réponse"), 'error');
            } finally {
                input.disabled = false;
                input.focus();
            }
        }

    