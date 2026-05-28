const fs = require('fs');
let content = fs.readFileSync('services/recommendation_engine.js', 'utf8');

const fetchUsersStr = `
        const allUserIds = new Set([...Object.keys(userOrders), ...Object.keys(allViews)]);
        
        // --- FETCH USER LANGUAGES ---
        const { data: usersData } = await supabase.from('bot_users').select('id, language_code, data');
        const userLangs = {};
        if (usersData) {
            usersData.forEach(u => {
                let lang = u.language_code || (u.data && u.data.language) || 'fr';
                const rawId = String(u.id).split('_').pop();
                userLangs[rawId] = lang;
                userLangs[u.id] = lang;
            });
        }
`;

content = content.replace("const allUserIds = new Set([...Object.keys(userOrders), ...Object.keys(allViews)]);", fetchUsersStr);

const langExtractStr = `
                    const rawTgId = String(userId).split('_').pop();
                    const userLang = userLangs[rawTgId] || userLangs[userId] || 'fr';
                    const message = generateDynamicText(firstName, topProduct, candidateType, userLang);
`;

content = content.replace(/const userLang = uOrders\.length > 0 \? \(uOrders\[0\]\.language_code \|\| 'fr'\) : 'fr';\s*const message = generateDynamicText\(firstName, topProduct, candidateType, userLang\);/, langExtractStr);

fs.writeFileSync('services/recommendation_engine.js', content, 'utf8');
console.log('Fixed recommendation engine language code');
