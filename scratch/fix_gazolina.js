require('dotenv').config({ path: '../.env' });
const { updateUser, getUser } = require('../services/database');

async function fixGazolina() {
    const userId = 'telegram_1183134641';
    try {
        console.log(`Checking user ${userId}...`);
        const user = await getUser(userId);
        if (!user) {
            console.log('User not found in database.');
            return;
        }
        console.log(`Found user: ${user.username} (${user.first_name}). Currently is_admin: ${user.is_admin}, is_blocked: ${user.is_blocked}`);
        
        console.log('Updating user to is_admin: true, is_blocked: false...');
        await updateUser(userId, { is_admin: true, is_blocked: false });
        console.log('Update successful.');

        const updatedUser = await getUser(userId);
        console.log(`Verified user: ${updatedUser.username}. Now is_admin: ${updatedUser.is_admin}, is_blocked: ${updatedUser.is_blocked}`);
    } catch (e) {
        console.error('Error:', e);
    }
}

fixGazolina().then(() => process.exit(0));
