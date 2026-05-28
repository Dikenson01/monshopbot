require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.from('bot_orders').select('*').limit(1);
    if (error) console.error("Error:", error);
    else console.log("Columns:", data.length > 0 ? Object.keys(data[0]) : "No data, but table exists.");
}
check();
