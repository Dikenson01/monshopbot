const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function check() {
    const { data, error } = await supabase.from('bot_products').delete().eq('id', 'mod_payment');
    console.log("Deleted mod_payment from monshopbot:", error || "Success");
}
check();
