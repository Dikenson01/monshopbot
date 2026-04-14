require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { encrypt } = require('../services/encryption');

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Utility functions
const makeId = () => crypto.randomBytes(8).toString('hex');
const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

async function populate() {
    console.log('🚀 Syncing and Encrypting demo data for monshopbot...');

    // Helper to get columns
    const getColumns = async (table) => {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error || !data || data.length === 0) return [];
            return Object.keys(data[0]);
        } catch (e) { return []; }
    };

    // 1. Demo Products (Plain URLs)
    console.log('🍎 Adding products (Plain URLs)...');
    const products = [
        {
            id: 'prod_banana',
            name: 'Bananes Bio (1kg)',
            price: 2.50,
            category: 'Fruits',
            image_url: 'https://images.unsplash.com/photo-1571771894821-ad9902621ec0?auto=format&fit=crop&w=800&q=80',
            description: 'Bananes fraîches et biologiques, parfaites pour vos smoothies.',
            stock: 100,
            unit: 'kg',
            priority: 1
        },
        {
            id: 'prod_flour',
            name: 'Farine de Blé T55',
            price: 1.80,
            category: 'Épicerie',
            image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
            description: 'Farine de qualité supérieure pour toutes vos pâtisseries.',
            stock: 50,
            unit: 'pièce',
            priority: 2
        },
        {
            id: 'prod_milk',
            name: 'Lait Entier Bio (1L)',
            price: 1.45,
            category: 'Frais',
            image_url: 'https://images.unsplash.com/photo-1563636619-e9108b901977?auto=format&fit=crop&w=800&q=80',
            description: 'Lait frais de ferme, pasteurisé et riche en goût.',
            stock: 80,
            unit: 'pièce',
            priority: 3
        },
        {
            id: 'prod_eggs',
            name: 'Œufs Frais x12',
            price: 3.20,
            category: 'Frais',
            image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
            description: 'Douzaine d\'œufs de poules élevées en plein air.',
            stock: 40,
            unit: 'boîte',
            priority: 4
        },
        {
            id: 'prod_bread',
            name: 'Baguette Tradition',
            price: 1.20,
            category: 'Boulangerie',
            image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
            description: 'Croustillante et cuite au feu de bois.',
            stock: 30,
            unit: 'pièce',
            priority: 5
        }
    ];

    await supabase.from('bot_orders').delete().neq('id', 'void');
    await supabase.from('bot_products').delete().neq('id', 'void');

    for (const p of products) {
        await supabase.from('bot_products').insert({ ...p, is_active: true, supplier_id: null });
    }

    // 2. Demo Users (ENCRYPTED)
    console.log('👥 Restoring users (Encrypted for Broadcast compatibility)...');
    const usersToRestore = [
        { id: 'telegram_1183134641', platform: 'telegram', platform_id: '1183134641', first_name: 'Gazolina94', username: 'Gazolina94', type: 'user' },
        { id: 'telegram_user1', platform: 'telegram', platform_id: '1', first_name: 'Jean', username: 'jean_demo', type: 'user' },
        { id: 'telegram_user2', platform: 'telegram', platform_id: '2', first_name: 'Marie', username: 'marie_demo', type: 'user' },
        { id: 'whatsapp_user4', platform: 'whatsapp', platform_id: '4', first_name: 'Sophie', username: 'sophie_wa', type: 'user' }
    ];

    // Wipe users first to ensure correct encryption key is used for all
    await supabase.from('bot_users').delete().neq('id', 'void');

    for (const u of usersToRestore) {
        const encryptedUser = {
            id: u.id,
            platform: u.platform,
            platform_id: u.platform_id,
            type: u.type,
            first_name: encrypt(u.first_name),
            username: encrypt(u.username),
            date_inscription: randomDate(new Date(2026, 0, 1), new Date()),
            is_active: true,
            is_blocked: false,
            is_approved: true
        };
        await supabase.from('bot_users').insert(encryptedUser);
    }

    // 3. Demo Orders (Populate Charts)
    console.log('📦 Generating orders for analytics...');
    const orderCols = await getColumns('bot_orders');
    const statuses = ['delivered', 'delivered', 'delivered', 'delivered', 'cancelled', 'pending'];
    
    for (let i = 0; i < 80; i++) {
        const user = usersToRestore[Math.floor(Math.random() * usersToRestore.length)];
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const total = product.price * qty;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const date = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());

        const orderData = {
            id: `ord_${makeId()}`,
            user_id: user.id,
            total_price: total,
            status: status,
            created_at: date
        };

        const tryAdd = (key, val) => {
            if (orderCols.length === 0 || orderCols.includes(key) || ['delivered_at', 'is_priority', 'livreur_name', 'cart', 'product_name', 'quantity', 'platform', 'first_name'].includes(key)) orderData[key] = val;
        };

        if (status === 'delivered') tryAdd('delivered_at', new Date(new Date(date).getTime() + 3600000).toISOString());
        tryAdd('is_priority', Math.random() > 0.8);
        tryAdd('livreur_name', 'Thomas (Livreur Demo)');
        tryAdd('cart', JSON.stringify([{ id: product.id, name: product.name, price: product.price, qty }]));
        tryAdd('product_name', product.name);
        tryAdd('quantity', qty);
        tryAdd('platform', user.platform);
        tryAdd('first_name', user.first_name); // Keep for historical display

        const { error } = await supabase.from('bot_orders').insert(orderData);
    }

    console.log('✅ Final population complete! Everything is synced and encrypted.');
}

populate();
