async function useSupabaseAuthState(sessionId) {
    const TABLE = 'bot_state';
    const NAMESPACE = 'wa_session';
    const DB_TIMEOUT = 10000;
    
    // Dynamic import for ESM-only baileys
    const baileysMod = await import('@whiskeysockets/baileys');
    const BufferJSON = baileysMod.BufferJSON;
    const initAuthCreds = baileysMod.initAuthCreds;

    // Construit un ID unique pour bot_state : "wa_session::{sessionId}::{key}"
    function makeId(key) {
        return `${NAMESPACE}::${sessionId}::${key}`;
    }

    async function readData(key) {
        try {
            const { data, error } = await supabase
                .from(TABLE)
                .select('value')
                .eq('id', makeId(key))
                .abortSignal(AbortSignal.timeout(DB_TIMEOUT))
                .single();
            
            if (error) {
                if (error.code !== 'PGRST116') {
                    console.error(`[WA-DB-READ-ERR] ${key}:`, error.message);
                    throw error;
                }
            }

            if (data) {
                const creds = JSON.parse(JSON.stringify(data.value), BufferJSON.reviver);
                console.log(`[WA-DB] Session primary data found for ${key} (creds registered: ${creds?.registered})`);
                return creds;
            }

            // [🛡️ REDONDANCE] Si la session principale est vide, on cherche dans le backup
            const backupId = `wa_backup::${sessionId}::${key}`;
            const { data: backupData, error: backupError } = await supabase
                .from(TABLE)
                .select('value')
                .eq('id', backupId)
                .maybeSingle();

            if (backupError) {
                console.error(`[WA-DB-BACKUP-ERR] ${backupId}:`, backupError.message);
                throw backupError;
            }

            if (backupData) {
                console.log(`[WA-DB] 🛡️ Restoring session from BACKUP for ${key}`);
                // Restauration vers la session principale
                const serialized = JSON.parse(JSON.stringify(backupData.value));
                supabase.from(TABLE).upsert({
                    id: makeId(key),
                    namespace: NAMESPACE,
                    user_key: key,
                    value: serialized,
                    updated_at: new Date().toISOString()
                }).then(() => {});

                return JSON.parse(JSON.stringify(backupData.value), BufferJSON.reviver);
            }
            console.log(`[WA-DB] ⚠️ No session data found for ${key} in primary or backup.`);

            return null;
        } catch (e) {
            console.error(`[WA-DB-READ-ERR] Key ${key}:`, e.message);
            throw e; // Propage l'erreur pour empêcher une mauvaise init
        }
    }

    async function writeData(key, value) {
        try {
            const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
            const id = makeId(key);
            
            // Verrou local préventif (collision-safe)
            if (global.wa_db_locks?.[id]) return;
            if (!global.wa_db_locks) global.wa_db_locks = {};
            global.wa_db_locks[id] = true;

            try {
                const payload = {
                    id: id,
                    namespace: NAMESPACE,
                    user_key: key,
                    value: serialized,
                    updated_at: new Date().toISOString()
                };

                // Écriture principale
                await supabase.from(TABLE).upsert(payload, { onConflict: 'id' }).abortSignal(AbortSignal.timeout(DB_TIMEOUT));

                // Écriture redondante (Backup) - Persiste même après clearSession()
                const backupId = `wa_backup::${sessionId}::${key}`;
                await supabase.from(TABLE).upsert({
                    ...payload,
                    id: backupId,
                    namespace: 'wa_backup'
                }, { onConflict: 'id' });
            } finally {
                delete global.wa_db_locks[id];
            }

        } catch (e) {
            console.error(`[WA-DB] writeData error for key ${key}:`, e.message);
        }
    }

    async function removeData(key) {
        try {
            await supabase.from(TABLE).delete().eq('id', makeId(key));
        } catch (e) { }
    }

    async function clearAllData() {
        try {
            // Supprimer toutes les entrées de cette session (Primaire ET Backup)
            // On nettoie tout pour éviter la boucle infinie de restauration d'identifiants rejetés (401)
            const { error } = await supabase.from(TABLE).delete()
                .or(`namespace.eq.${NAMESPACE},namespace.eq.wa_backup`)
                .filter('id', 'like', `%::${sessionId}::%`);
            
            if (error) throw error;
            console.log(`[WA-DB] Session ${sessionId} (and backup) cleared from Supabase`);
        } catch (e) {
            console.error('[WA-DB] clearAllData error:', e.message);
        }
    }

    // Chargement initial des credentials depuis Supabase (avec retry léger pour éviter le crash au boot)
    let credsRaw = null;
    let attempts = 0;
    while (attempts < 3) {
        try {
            credsRaw = await readData('creds');
            break;
        } catch (dbErr) {
            attempts++;
            if (attempts >= 3) {
                console.error(`[WA-DB-CRITICAL] Échec définitif après 3 tentatives (${dbErr.message}).`);
                throw new Error(`CRITICAL_STORAGE_ERROR: ${dbErr.message}`);
            }
            console.warn(`[WA-DB-RETRY] Tentative ${attempts}/3 échouée (${dbErr.message}). Nouvel essai dans 5s...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    const creds = credsRaw || initAuthCreds();
    if (!credsRaw) {
        console.warn(`[WA-DB] ⚠️ AUCUNE SESSION TROUVÉE pour ${sessionId}. Prêt pour un nouveau QR code (Backup vide également).`);
    } else {
        console.log(`[WA-DB] Auth state chargé avec succès (session: ${sessionId})`);
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, data) => {
                    const dict = {};
                    for (const key of data) {
                        const val = await readData(`${type}-${key}`);
                        if (val) dict[key] = val;
                    }
                    return dict;
                },
                set: async (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const val = data[category][id];
                            if (val) await writeData(`${category}-${id}`, val);
                            else await removeData(`${category}-${id}`);
                        }
                    }
                }
            }
        },
        saveCreds: () => writeData('creds', creds),
        clearSession: clearAllData
    };
}
