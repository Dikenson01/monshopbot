require('dotenv').config();
const { supabase } = require('./services/database');

(async () => {
    try {
        const { data: o } = await supabase.from('bot_orders').select('*').limit(1);
        console.log("Orders:", o ? Object.keys(o[0]) : "No data");
        
        const { data: b } = await supabase.from('broadcasts').select('*').limit(1);
        console.log("Broadcasts:", b ? Object.keys(b[0]) : "No data");
        
        const { data: r } = await supabase.from('bot_reviews').select('*').limit(1);
        console.log("Reviews:", r ? Object.keys(r[0]) : "No data");
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
})();
