
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { Telegraf } = require('telegraf');

const BASE_DIR = '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /';
const BOTS = [
    { name: 'La frappe IDF', dir: 'La frappe IDF' },
    { name: 'La Fabrik paris bot', dir: 'La Fabrik paris bot', manualToken: '8549299880:AAHO1Nj-xLj3SELZ4h9Uze1_NDDwaB2oVA4', manualSupabase: { url: 'https://tsafkhhyqmlknxrgnqgw.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYWZraGh5cW1sa254cmducWd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY3MDg0MCwiZXhwIjoyMDg4MjQ2ODQwfQ.1-AzrYIDY9PU-VbWRHe_KoIzlpzD6Fj3Q_nCOIOeXnQ' } },
    { name: 'TIMLEMEILLEURIDF', dir: 'TIMLEMEILLEURIDF' },
    { name: 'meet up', dir: 'meet up' }
];

const message = `Bonjour, j’espère que tu vas bien.

Pour tout besoin relatif au bot ou si tu souhaites le faire tester à quelqu’un, rends-toi sur ce bot Telegram : @Bottelegramt_bot.

Pour que tes amis puissent tester, ils doivent cliquer sur 👉🏻 « J’aimerais en savoir plus ».

Si tu rencontres le moindre problème, clique sur 👉🏻 « Je suis déjà client ». Tu recevras une réponse dans la journée ainsi qu’une résolution de ton problème sous un maximum de 48 heures après réception de ton paiement.

Les paiements se font désormais uniquement par virement bancaire, en cryptomonnaie ou par tout autre moyen de paiement qui te conviendra, à l’exception des espèces.

Merci. Ce message n’est visible que par toi et sera le seul qui te sera envoyé, sauf si ce bot disparaît, auquel cas je te communiquerai le lien du nouveau bot.

Merci pour ta confiance, et j’espère pouvoir continuer à développer tes projets présents et futurs.

Le Devellopeur.`;

async function run() {
    console.log('🚀 Démarrage de la diffusion Multi-Bots (Admins Only)...');
    
    const globalProcessedAdmins = new Set();

    for (const bot of BOTS) {
        const fullPath = path.join(BASE_DIR, bot.dir);
        let envPath = path.join(fullPath, '.env');
        
        let token, supabaseUrl, supabaseKey;

        if (fs.existsSync(envPath)) {
            const env = dotenv.parse(fs.readFileSync(envPath));
            token = bot.manualToken || env.BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
            supabaseUrl = bot.manualSupabase?.url || env.SUPABASE_URL;
            supabaseKey = bot.manualSupabase?.key || env.SUPABASE_KEY;
        } else if (bot.manualToken) {
            token = bot.manualToken;
            supabaseUrl = bot.manualSupabase.url;
            supabaseKey = bot.manualSupabase.key;
        }

        if (!token || !supabaseUrl || !supabaseKey) continue;

        console.log(`\n📦 Traitement du bot: ${bot.name}...`);
        
        try {
            const tg = new Telegraf(token);
            try { await tg.telegram.getMe(); } catch (e) { continue; }

            const supabase = createClient(supabaseUrl, supabaseKey);

            const targetIds = new Set();

            // Try bot_users table
            const { data: admins } = await supabase.from('bot_users').select('id').eq('is_admin', true);
            if (admins) admins.forEach(a => targetIds.add(a.id.replace('telegram_', '')));

            // Try bot_settings table
            const { data: bSet } = await supabase.from('bot_settings').select('*');
            if (bSet) {
                bSet.forEach(s => {
                    const idStr = s.admin_telegram_id || s.admin_id;
                    if (idStr) String(idStr).match(/\d+/g)?.forEach(id => targetIds.add(id));
                });
            }

            // Try app_settings table
            const { data: aSet } = await supabase.from('app_settings').select('*');
            if (aSet) {
                aSet.forEach(s => {
                    const idStr = s.admin_telegram_id || s.admin_id;
                    if (idStr) String(idStr).match(/\d+/g)?.forEach(id => targetIds.add(id));
                });
            }

            console.log(`📊 ${targetIds.size} admins trouvés.`);

            for (const id of targetIds) {
                const globalKey = `${token}_${id}`;
                if (globalProcessedAdmins.has(globalKey)) continue;

                try {
                    await tg.telegram.sendMessage(id, message, { parse_mode: 'HTML' });
                    globalProcessedAdmins.add(globalKey);
                    console.log(`✅ Envoyé à ${id} (@${bot.name})`);
                } catch (e) {
                    console.error(`❌ Echec pour ${id}:`, e.message);
                }
            }
        } catch (e) {
            console.error(`❌ Erreur critique pour ${bot.name}:`, e.message);
        }
    }

    console.log('\n✨ TOUTES LES DIFFUSIONS SONT TERMINÉES !');
    process.exit(0);
}

run();
