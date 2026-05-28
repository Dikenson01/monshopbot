require('dotenv').config();
const { getRecentUsers, getStatsOverview } = require('./services/database');

(async () => {
    try {
        console.log("Fetching stats...");
        const stats = await getStatsOverview();
        console.log("Stats:", stats);

        console.log("\nFetching recent users...");
        const users = await getRecentUsers(100);
        console.log("Users count:", users.length);
        
        // Print the first user to see its structure
        if (users.length > 0) {
            console.log("First user:", users[0]);
        }
        
        // Let's test the map function manually simulating dashboard
        let error = null;
        try {
            users.map(u => {
                const a = u.first_name ? u.first_name[0].toUpperCase() : '?';
                const b = (u.first_name || '').replace(/'/g, "\\'");
                const c = u.username || (u.platform_id ? String(u.platform_id).substring(0, 20) : 'Inconnu');
            });
            console.log("Dashboard map simulation passed.");
        } catch(e) {
            console.error("Dashboard map simulation FAILED:", e);
        }
    } catch(e) {
        console.error("Error:", e);
    }
    process.exit(0);
})();
