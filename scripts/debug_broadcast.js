require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function debugBroadcastQuery() {
    console.log('🔍 Debugging getAllUsersForBroadcast query...');
    const COL_USERS = 'bot_users';
    
    // Test 1: Simple select
    const { data: d1, error: e1 } = await supabase.from(COL_USERS).select('*').limit(5);
    if (e1) console.error('❌ Simple select FAIL:', e1.message);
    else console.log('✅ Simple select OK, found:', d1.length);

    // Test 2: Selective select (mimicking the bot code)
    const selectStr = 'id, platform, platform_id, type, username, first_name, last_name, order_count, wallet_balance, points, date_inscription, is_livreur, is_available, is_blocked, current_city, data, blocked_at';
    const { data: d2, error: e2 } = await supabase.from(COL_USERS).select(selectStr).limit(5);
    if (e2) {
        console.error('❌ Selective select FAIL:', e2.message);
        // Let's find which column is missing
        const cols = selectStr.split(',').map(c => c.trim());
        for (const c of cols) {
            const { error } = await supabase.from(COL_USERS).select(c).limit(1);
            if (error) console.error(`   ⚠️ Column "${c}" is MISSING or inaccessible:`, error.message);
        }
    } else {
        console.log('✅ Selective select OK, found:', d2.length);
    }
}

debugBroadcastQuery();
