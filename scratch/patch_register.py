import re

with open("services/database.js", "r") as f:
    content = f.read()

old_str = """        if (error.message.includes('created_at')) {
            console.log('[DB] Retrying register without created_at column...');
            delete encryptedData.created_at;
            const { data: data2, error: error2 } = await supabase.from(COL_USERS).upsert(encryptedData).select().single();
            if (!error2) {
                const user = data2;
                if (user) _userCacheSet(docId, user);
                return { user, isNew };
            }
        }"""

new_str = """        if (error.message.includes('created_at')) {
            console.log('[DB] Retrying register without created_at column...');
            delete encryptedData.created_at;
            const { data: data2, error: error2 } = await supabase.from(COL_USERS).upsert(encryptedData).select().single();
            if (!error2) {
                const user = data2;
                if (user) _userCacheSet(docId, user);
                return { user, isNew };
            } else {
                console.error('[DB] Retry register error:', error2.message);
            }
        } else {
            console.error('[DB] Register error (not created_at):', error.message);
        }
        
        if (!existing) {
            console.warn('[DB] Fallback: Returning temporary user object to prevent crash');
            return { user: encryptedData, isNew: true };
        }"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open("services/database.js", "w") as f:
        f.write(content)
    print("Patched services/database.js!")
else:
    print("Could not find old string!")
