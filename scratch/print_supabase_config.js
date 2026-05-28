require('dotenv').config();
const { supabase } = require('../config/supabase');

// Access private properties of supabase client to see its URL
const url = supabase.supabaseUrl;
console.log("Supabase URL in config/supabase.js:", url);
console.log("process.env.SUPABASE_URL:", process.env.SUPABASE_URL);
