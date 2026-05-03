const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function runMigration() {
    console.log('🚀 Starting migration...');

    // 1. Create Tables
    const { error: tableError } = await supabase.rpc('exec_sql', {
        sql_string: `
            CREATE TABLE IF NOT EXISTS bot_client_projects (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                bot_name TEXT,
                bot_type TEXT,
                features JSONB DEFAULT '[]',
                subscription_plan TEXT DEFAULT 'none',
                subscription_expires_at TIMESTAMPTZ,
                last_restored_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS bot_features_catalog (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                price FLOAT,
                category TEXT
            );
        `
    });

    if (tableError) {
        console.warn('⚠️ RPC exec_sql might not exist. Trying direct insert/upsert if table exists.');
    }

    // 2. Populate Catalog
    const features = [
        { id: 'catalog_wa', name: 'Catalogue WhatsApp', description: 'Interface de vente fluide sur WhatsApp', price: 150.0, category: 'core' },
        { id: 'livreur_system', name: 'Système Livreur Pro', description: 'Console dédiée pour vos livreurs avec géolocalisation', price: 150.0, category: 'logistics' },
        { id: 'marketplace', name: 'Espace Fournisseur', description: 'Connectez-vous à des grossistes directement dans votre bot', price: 200.0, category: 'supply' },
        { id: 'crypto_pay', name: 'Paiements Crypto Auto', description: 'Encaissez en Bitcoin, USDT, etc. avec validation automatique', price: 150.0, category: 'finance' },
        { id: 'referral', name: 'Système de Parrainage', description: 'Boostez votre croissance avec le bouche-à-oreille', price: 100.0, category: 'marketing' },
        { id: 'custom_design', name: 'Design Personnalisé', description: 'Une interface unique aux couleurs de votre marque', price: 200.0, category: 'design' },
        { id: 'advanced_stats', name: 'Dashboard Stats Pro', description: 'Analyses détaillées de vos ventes et comportements clients', price: 150.0, category: 'admin' }
    ];

    const { error: insertError } = await supabase.from('bot_features_catalog').upsert(features);
    
    if (insertError) {
        console.error('❌ Error inserting features:', insertError.message);
    } else {
        console.log('✅ Catalog populated successfully!');
    }
}

runMigration();
