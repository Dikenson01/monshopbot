const fs = require('fs');

const dest = 'services/database.js';
let destCode = fs.readFileSync(dest, 'utf8');

const fnCode = fs.readFileSync('scratch/extract_auth_state.js', 'utf8');

if (!destCode.includes('useSupabaseAuthState')) {
    let newDest = destCode.replace(/module\.exports = \{/, fnCode + '\n\nmodule.exports = {\n    useSupabaseAuthState,');
    fs.writeFileSync(dest, newDest);
    console.log('Injected useSupabaseAuthState');
} else {
    console.log('Already injected');
}
