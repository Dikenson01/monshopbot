const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data: admins, error: errAdmins } = await supabase.from('bot_users').select('id, platform_id, is_admin, is_moderateur, is_blocked').eq('is_admin', true);
    console.log("Admins in DB:", errAdmins || admins);

    const { data: mods, error: errMods } = await supabase.from('bot_users').select('id, platform_id, is_admin, is_moderateur, is_blocked').eq('is_moderateur', true);
    console.log("Moderators in DB:", errMods || mods);
}
check();
