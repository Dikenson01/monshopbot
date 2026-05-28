const fs = require('fs');

let db = fs.readFileSync('services/database.js', 'utf8');
db = db.replace(/order\.notes/g, 'order.cart');
fs.writeFileSync('services/database.js', db);

let orderSys = fs.readFileSync('handlers/order_system.js', 'utf8');
orderSys = orderSys.replace(/notes: JSON\.stringify\(pending\.cart/g, 'cart: JSON.stringify(pending.cart');
fs.writeFileSync('handlers/order_system.js', orderSys);

let supplierMarket = fs.readFileSync('handlers/supplier_marketplace.js', 'utf8');
supplierMarket = supplierMarket.replace(/\{ notes: 'Refusée par le fournisseur' \}/g, '{}');
fs.writeFileSync('handlers/supplier_marketplace.js', supplierMarket);

console.log("Patched notes -> cart");
