const { createClient } = require('@supabase/supabase-js');
const { validateLicense } = require('../services/license');
// Environment variables are loaded in index.js

if (!validateLicense()) {
    console.error('❌ Licence invalide.');
    process.exit(1);
}

// Emergency hardcoded fallback if environment variables are missing
const supabaseUrl = process.env.SUPABASE_URL || 'https://kryiyykqdpcpwkknodeq.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeWl5eWtxZHBjcHdra25vZGVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM3MDM4MCwiZXhwIjoyMDg5OTQ2MzgwfQ.pPBWSna6tDoDhDFt-sFP1l0s2D8-YcIBFTltCzII_QE';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERREUR CRITIQUE : Identifiants Supabase absents du système.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
