const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.from('bot_products').select('id, name, category, is_active');
    if (error) console.error(error);
    else {
        console.log("Total products:", data.length);
        console.log(data);
    }
}
check();
