require('dotenv').config();
const { supabase } = require('./services/database');
const COL_USERS = 'users';

(async () => {
    try {
        const { data, error } = await supabase.from(COL_USERS).select('*').eq('is_approved', true).eq('is_blocked', false).order('created_at', { ascending: false }).limit(10);
        console.log("Query 1 error:", error);
        console.log("Query 1 data length:", data ? data.length : null);
        
        const { data: data2, error: err2 } = await supabase.from(COL_USERS).select('*').eq('is_approved', true).eq('is_blocked', false).limit(10);
        console.log("Query 2 (no order) error:", err2);
        console.log("Query 2 data length:", data2 ? data2.length : null);
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
})();
