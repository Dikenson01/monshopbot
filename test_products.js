const { supabase } = require('./config/supabase');
async function run() {
    const { data } = await supabase.from('bot_products').select('*');
    console.log(data.map(p => ({id: p.id, name: p.name, category: p.category})));
}
run();
