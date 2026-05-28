const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /bot presentation/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clear() {
    const { data, error } = await supabase
        .from('bot_state')
        .delete()
        .like('id', 'wa_session:monshopbot_wa:%');
    console.log('Cleared monshopbot_wa session data:', error || 'Success');
}
clear();
