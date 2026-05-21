const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('web/views/catalog.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

console.log("Nav Item Active:", !!document.querySelector('.bottom-nav .nav-item.active'));
console.log("Page Shop:", !!document.getElementById('page-shop'));
console.log("Page Bots:", !!document.getElementById('page-bots'));
console.log("Page Orders:", !!document.getElementById('page-orders'));
console.log("Page Profile:", !!document.getElementById('page-profile'));
