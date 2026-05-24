const allProducts = [
  { name: "A", category: "PACK" },
  { name: "B", category: "MODULE" },
  { name: "C", category: "Pack", raw_category: "PACK" },
  { name: "D", category: "Module", raw_category: "MODULE" },
  { name: "E", category: "Frais" }
];

const botProducts = allProducts.filter(p => (p.raw_category || p.category) && ((p.raw_category || p.category).includes('PACK') || (p.raw_category || p.category).includes('MODULE')));

console.log(botProducts.map(p => p.name));

const demoProducts = allProducts.filter(p => !(p.raw_category || p.category) || (!(p.raw_category || p.category).includes('PACK') && !(p.raw_category || p.category).includes('MODULE')));

console.log(demoProducts.map(p => p.name));
