require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspectUsers() {
    console.log('👥 Inspecting bot_users...');
    const { data, error } = await supabase.from('bot_users').select('id, first_name, username, platform');
    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    console.table(data);
}

inspectUsers();
