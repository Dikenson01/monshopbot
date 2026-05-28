const fs = require('fs');
let content = fs.readFileSync('services/database.js', 'utf8');
content = content.replace(/const cart = JSON\.parse\(order\.cart\);/g, "const cart = typeof order.cart === 'string' ? JSON.parse(order.cart) : order.cart;");
fs.writeFileSync('services/database.js', content);
console.log("Patched JSON parse");
