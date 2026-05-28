const fs = require('fs');
let code = fs.readFileSync('services/database.js', 'utf8');

// Fix getProducts
code = code.replace(
    "    const { data, error } = await query;\n    let prods = data || [];",
    "    const { data } = await query.order('created_at', { ascending: true });\n    let prods = data || [];"
);

// Fix getAllUsersForBroadcast
code = code.replace(
    "    if (platform && platform !== 'all') {\n        query = query.eq('platform', platform);\n    }\n\n    const { data, error } = await query;",
    "    if (platform && platform !== 'all') {\n        query = query.eq('platform', platform);\n    }\n\n    const { data, error } = await query.order('date_inscription', { ascending: true });"
);

fs.writeFileSync('services/database.js', code);
