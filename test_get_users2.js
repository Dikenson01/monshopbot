require('dotenv').config();
const { supabase } = require('./services/database');
const COL_USERS = 'bot_users';

(async () => {
    try {
        const { data, error } = await supabase.from(COL_USERS).select('*').limit(5);
        console.log("All Users data length:", data ? data.length : null);
        if (data && data.length > 0) {
            console.log("First user is_approved:", data[0].is_approved);
            console.log("First user is_blocked:", data[0].is_blocked);
            console.log("First user created_at:", data[0].created_at);
        }
        
        const q1 = await supabase.from(COL_USERS).select('*').eq('is_approved', true).eq('is_blocked', false).limit(5);
        console.log("Approved Users length:", q1.data ? q1.data.length : null);

        // Wait... is_approved is a boolean in DB or a string?
        const q2 = await supabase.from(COL_USERS).select('*').eq('is_approved', 'true').eq('is_blocked', 'false').limit(5);
        console.log("Approved Users (string eq) length:", q2.data ? q2.data.length : null);
        
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
})();
