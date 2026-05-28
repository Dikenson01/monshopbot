require('dotenv').config();
const { getAppSettings } = require('../services/database');

(async () => {
    try {
        const settings = await getAppSettings();
        console.log("Settings from DB:", settings);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
