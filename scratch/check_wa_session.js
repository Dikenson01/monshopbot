const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function check() {
    const { data } = await supabase.from('bot_state').select('id');
    console.log("Sessions:", data.filter(d => d.id.startsWith('wa_session:monshopbot')).length);
}
check();
