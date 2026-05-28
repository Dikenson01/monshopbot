const { seedBaaSProducts } = require('../services/database');
async function force() {
    await seedBaaSProducts(true); // force = true if the function supports it
    console.log("Seeding complete.");
}
force().catch(console.error);
