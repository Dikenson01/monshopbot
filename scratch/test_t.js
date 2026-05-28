const { t } = require('../services/i18n');
console.log(t({ language_code: 'fr' }, 'msg_livreur_welcome', 'default', { first_name: 'Gazolina94' }));
console.log(t({ language_code: 'en' }, 'msg_livreur_welcome', 'default', { first_name: 'Gazolina94' }));
console.log(t({ language_code: 'es' }, 'msg_livreur_welcome', 'default', { first_name: 'Gazolina94' }));
console.log(t({ language_code: 'de' }, 'msg_livreur_welcome', 'default', { first_name: 'Gazolina94' }));
