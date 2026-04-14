require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkOrdersColumns() {
    console.log('🔍 Checking bot_orders columns...');
    // We try to select all columns and see what we get back even if empty
    const { data, error } = await supabase.from('bot_orders').select('*').limit(1);
    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    console.log('✅ Found columns:', data.length > 0 ? Object.keys(data[0]) : 'Table is empty');
    
    // Fallback: try to select a specific new column to see if it exists
    const { error: errorCart } = await supabase.from('bot_orders').select('cart').limit(1);
    if (errorCart) {
        console.warn('⚠️ Column "cart" is MISSING.');
    } else {
        console.log('✅ Column "cart" is PRESENT.');
    }
}

checkOrdersColumns();
