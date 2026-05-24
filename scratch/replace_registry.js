const fs = require('fs');
let srv = fs.readFileSync('server.js', 'utf8');

srv = srv.replace(/registry\.query\('whatsapp'\)/g, "dispatcher.channels.get('whatsapp')");
srv = srv.replace(/registry\.query\('telegram'\)/g, "dispatcher.channels.get('telegram')");

fs.writeFileSync('server.js', srv);
console.log('Replaced registry.query with dispatcher.channels.get in server.js');
