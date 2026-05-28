require('dotenv').config();
const { supabase } = require('./services/database');

(async () => {
    try {
        const { data, error } = await supabase.from('bot_users').select('*').limit(1);
        console.log(Object.keys(data[0]));
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
})();
