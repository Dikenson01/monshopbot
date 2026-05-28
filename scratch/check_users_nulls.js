require('dotenv').config();
const { supabase } = require('../services/database');
const COL_USERS = 'bot_users';

(async () => {
    try {
        const { data: allUsers, error: errAll } = await supabase.from(COL_USERS).select('id, is_approved, is_blocked, is_livreur, date_inscription');
        if (errAll) {
            console.error("Error fetching all users:", errAll);
            process.exit(1);
        }
        
        console.log(`Total users in DB: ${allUsers.length}`);
        
        let approvedCount = 0;
        let pendingCount = 0;
        let blockedCount = 0;
        let livreurCount = 0;
        
        const nulls = {
            is_approved: 0,
            is_blocked: 0,
            is_livreur: 0
        };
        
        for (const u of allUsers) {
            if (u.is_approved === null) nulls.is_approved++;
            if (u.is_blocked === null) nulls.is_blocked++;
            if (u.is_livreur === null) nulls.is_livreur++;
            
            if (u.is_approved) approvedCount++;
            if (u.is_blocked) blockedCount++;
            if (u.is_livreur) livreurCount++;
        }
        
        console.log("Null counts:", nulls);
        console.log("Counts in JS (truthy flags):");
        console.log(`- Approved: ${approvedCount}`);
        console.log(`- Blocked: ${blockedCount}`);
        console.log(`- Livreur: ${livreurCount}`);
        
        // Let's run the exact getStatsOverview counts
        const results = await Promise.all([
            supabase.from(COL_USERS).select('id', { count: 'exact', head: true }),
            supabase.from(COL_USERS).select('id', { count: 'exact', head: true }).eq('is_approved', true).eq('is_blocked', false).eq('is_livreur', false),
            supabase.from(COL_USERS).select('id', { count: 'exact', head: true }).eq('is_livreur', true),
            supabase.from(COL_USERS).select('id', { count: 'exact', head: true }).eq('is_approved', false).eq('is_blocked', false),
            supabase.from(COL_USERS).select('id', { count: 'exact', head: true }).eq('is_blocked', true),
        ]);
        
        console.log("Supabase exact counts results:");
        console.log("- results[0] (Total):", results[0]?.count);
        console.log("- results[1] (Approved && !Blocked && !Livreur):", results[1]?.count);
        console.log("- results[2] (Livreur):", results[2]?.count);
        console.log("- results[3] (Pending: !Approved && !Blocked):", results[3]?.count);
        console.log("- results[4] (Blocked):", results[4]?.count);
        
    } catch (e) {
        console.error("Execution error:", e);
    }
    process.exit(0);
})();
