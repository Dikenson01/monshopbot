const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data } = await supabase.from('bot_settings').select('*').eq('key', 'msg_livreur_welcome').single();
    console.log("msg_livreur_welcome:", data?.data);
}
check();
