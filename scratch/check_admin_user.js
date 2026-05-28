require('dotenv').config();
const { supabase } = require('../services/database');

(async () => {
    try {
        const { data, error } = await supabase.from('bot_users').select('*').eq('id', 'telegram_1183134641').single();
        if (error) {
            console.error("Error fetching user telegram_1183134641:", error);
        } else {
            console.log("User details in DB:", data);
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
