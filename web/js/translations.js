const translations = {
    fr: {
        'cart': 'Mon Panier',
        'nav_shop': 'Boutique',
        'nav_baas': 'BaaS',
        'nav_tracking': 'Suivi',
        'nav_profile': 'Profil',
        'search': 'Rechercher un produit...',
        'empty_catalog': 'Aucun produit disponible pour le moment.',
        'add_to_cart': 'Ajouter',
        'checkout': 'Valider la commande',
        'total': 'Total',
        'loading': 'Chargement en cours...',
        'error': 'Une erreur est survenue',
        'success': 'Opération réussie',
        'orders': 'Mes Commandes',
        'support': 'Assistance',
        'address_title': 'Adresse de livraison',
        'confirm_address': 'Confirmer l\\'adresse',
        'login': 'Se connecter',
        'dashboard': 'Tableau de bord',
        'settings': 'Paramètres',
        'back': 'Retour',
        'cancel': 'Annuler',
        'confirm': 'Confirmer',
        'yes': 'Oui',
        'no': 'Non',
        'delivery': 'Livraison à domicile',
        'pickup': 'Retrait sur place',
        'livreur': 'Espace Livreur',
        'status': 'Statut de la commande',
        'available': 'Disponible',
        'unavailable': 'Indisponible',
        'history': 'Historique',
        'my_shop': 'Ma Boutique'
    },
    en: {
        'cart': 'My Cart',
        'nav_shop': 'Shop',
        'nav_baas': 'BaaS',
        'nav_tracking': 'Tracking',
        'nav_profile': 'Profile',
        'search': 'Search for products...',
        'empty_catalog': 'No products available at the moment.',
        'add_to_cart': 'Add',
        'checkout': 'Place Order',
        'total': 'Total',
        'loading': 'Loading...',
        'error': 'An error occurred',
        'success': 'Success',
        'orders': 'My Orders',
        'support': 'Customer Support',
        'address_title': 'Delivery Address',
        'confirm_address': 'Confirm Address',
        'login': 'Log in',
        'dashboard': 'Dashboard',
        'settings': 'Settings',
        'back': 'Back',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'yes': 'Yes',
        'no': 'No',
        'delivery': 'Home Delivery',
        'pickup': 'Click & Collect',
        'livreur': 'Courier Area',
        'status': 'Order Status',
        'available': 'Available',
        'unavailable': 'Unavailable',
        'history': 'History',
        'my_shop': 'My Shop'
    },
    es: {
        'cart': 'Mi Carrito',
        'nav_shop': 'Tienda',
        'nav_baas': 'BaaS',
        'nav_tracking': 'Seguimiento',
        'nav_profile': 'Perfil',
        'search': 'Buscar productos...',
        'empty_catalog': 'No hay productos disponibles por el momento.',
        'add_to_cart': 'Añadir',
        'checkout': 'Realizar Pedido',
        'total': 'Total',
        'loading': 'Cargando...',
        'error': 'Ha ocurrido un error',
        'success': 'Operación exitosa',
        'orders': 'Mis Pedidos',
        'support': 'Atención al Cliente',
        'address_title': 'Dirección de Entrega',
        'confirm_address': 'Confirmar Dirección',
        'login': 'Iniciar Sesión',
        'dashboard': 'Panel de Control',
        'settings': 'Ajustes',
        'back': 'Volver',
        'cancel': 'Cancelar',
        'confirm': 'Confirmar',
        'yes': 'Sí',
        'no': 'No',
        'delivery': 'Entrega a Domicilio',
        'pickup': 'Recogida en Tienda',
        'livreur': 'Zona Repartidor',
        'status': 'Estado del Pedido',
        'available': 'Disponible',
        'unavailable': 'Agotado',
        'history': 'Historial',
        'my_shop': 'Mi Tienda'
    },
    de: {
        'cart': 'Mein Warenkorb',
        'nav_shop': 'Shop',
        'nav_baas': 'BaaS',
        'nav_tracking': 'Verfolgung',
        'nav_profile': 'Profil',
        'search': 'Produkte suchen...',
        'empty_catalog': 'Derzeit sind keine Produkte verfügbar.',
        'add_to_cart': 'Hinzufügen',
        'checkout': 'Bestellung aufgeben',
        'total': 'Gesamt',
        'loading': 'Wird geladen...',
        'error': 'Ein Fehler ist aufgetreten',
        'success': 'Erfolgreich',
        'orders': 'Meine Bestellungen',
        'support': 'Kundenservice',
        'address_title': 'Lieferadresse',
        'confirm_address': 'Adresse bestätigen',
        'login': 'Anmelden',
        'dashboard': 'Dashboard',
        'settings': 'Einstellungen',
        'back': 'Zurück',
        'cancel': 'Abbrechen',
        'confirm': 'Bestätigen',
        'yes': 'Ja',
        'no': 'Nein',
        'delivery': 'Lieferung nach Hause',
        'pickup': 'Abholung im Geschäft',
        'livreur': 'Kurierbereich',
        'status': 'Bestellstatus',
        'available': 'Verfügbar',
        'unavailable': 'Nicht verfügbar',
        'history': 'Verlauf',
        'my_shop': 'Mein Shop'
    }
};

let currentLang = 'fr';

function initTranslations() {
    // Determine language from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('lang')) {
        currentLang = urlParams.get('lang');
    } else if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
        currentLang = Telegram.WebApp.initDataUnsafe.user.language_code || 'fr';
    }

    if (!translations[currentLang]) {
        currentLang = 'fr';
    }

    // Apply translations to DOM
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = translations[currentLang][key];
            } else {
                el.innerText = translations[currentLang][key];
            }
        }
    });
}

function t(key, variables = {}) {
    let text = (translations[currentLang] && translations[currentLang][key]) ? translations[currentLang][key] : (translations['fr'][key] || key);
    for (const [k, v] of Object.entries(variables)) {
        text = text.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    return text;
}

// Auto-init on load if in browser environment
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initTranslations);
}
