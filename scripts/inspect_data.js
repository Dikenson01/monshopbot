require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspectData() {
    console.log('🔍 Inspecting bot_products data...');
    const { data, error } = await supabase.from('bot_products').select('id, name, image_url, supplier_id').limit(10);
    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    console.table(data);
}

inspectData();
