require('dotenv').config();
const { getOrderAnalytics } = require('../services/database');

async function testAnalytics() {
    console.log('📊 Testing getOrderAnalytics execution...');
    try {
        const data = await getOrderAnalytics();
        console.log('✅ Analytics calculated successfully!');
        console.log(`💰 Total CA: ${data.totalCA}€`);
        console.log(`📦 Total Orders: ${data.totalOrders}`);
    } catch (e) {
        console.error('❌ Analytics ERROR:', e.message);
    }
}

testAnalytics();
