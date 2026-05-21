import re

with open('services/i18n.js', 'r') as f:
    i18n_content = f.read()

i18n_content = i18n_content.replace(
    "} else if (userOrContext.language) {",
    "} else if (userOrContext.data && userOrContext.data.language) {\n            langCode = userOrContext.data.language;\n        } else if (userOrContext.language) {"
)

with open('services/i18n.js', 'w') as f:
    f.write(i18n_content)

with open('handlers/start.js', 'r') as f:
    start_content = f.read()

start_content = start_content.replace(
    "await supabase.from(COL_USERS).update({ \n            language_code: lang, \n            data: { ...(ctx.state.user.data), language: lang } \n        }).eq('id', docId);",
    "const { error } = await supabase.from(COL_USERS).update({ language_code: lang, data: { ...(ctx.state.user.data), language: lang } }).eq('id', docId);\n        if (error) { await supabase.from(COL_USERS).update({ data: { ...(ctx.state.user.data), language: lang } }).eq('id', docId); }"
)

with open('handlers/start.js', 'w') as f:
    f.write(start_content)

print("Language switch logic patched")
