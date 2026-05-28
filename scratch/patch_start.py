with open("handlers/start.js", "r") as f:
    content = f.read()

old1 = "await ctx.telegram.setMyCommands(userCmds, { scope: { type: 'chat', chat_id: ctx.chat.id } }).catch(()=>{});"
new1 = "if (typeof ctx.telegram?.setMyCommands === 'function') await ctx.telegram.setMyCommands(userCmds, { scope: { type: 'chat', chat_id: ctx.chat.id } }).catch(()=>{});"

if old1 in content:
    content = content.replace(old1, new1)
    print("Patched start.js successfully!")
else:
    print("Could not find exact match for patch!")

with open("handlers/start.js", "w") as f:
    f.write(content)
