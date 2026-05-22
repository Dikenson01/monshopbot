const { t } = require('./services/i18n');
const user = { language_code: 'en' };
console.log(t(user, 'btn_catalog_classic', 'CATALOGUE CLASSIQUE'));
console.log(t(user, 'btn_active_deliveries_label', '🚚 MES LIVRAISONS EN COURS 🔥'));
