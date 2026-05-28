const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data } = await supabase.from('bot_settings').select('*').eq('key', 'bot_strings').single();
    console.log(JSON.stringify(data?.data?.fr?.msg_livreur_welcome, null, 2));
}
check();
