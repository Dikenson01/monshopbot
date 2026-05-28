const { registerUser } = require('../services/database');

async function test() {
    try {
        const result = await registerUser({
            id: 'test_123',
            username: 'tester',
            first_name: 'Mr Test'
        }, 'telegram', null);
        console.log("Register Result:", result);
    } catch(e) {
        console.error("Register Error:", e);
    }
}
test();
