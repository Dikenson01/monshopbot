
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_DIR = '/Users/dikenson/Desktop/Projet BOT (client deja terminée) /';
const BOTS = [
    'LE PLUG IDF',
    'La frappe IDF',
    'TIMLEMEILLEURIDF',
    'La Fabrik paris bot',
    'meet up'
];

console.log('🚀 Démarrage de la synchronisation Multi-Bots (Pull + Push)...');

BOTS.forEach(botDir => {
    const fullPath = path.join(BASE_DIR, botDir);
    const gitPath = path.join(fullPath, '.git');
    
    if (!fs.existsSync(gitPath)) return;

    console.log(`\n📦 Sync ${botDir}...`);
    try {
        const envClean = 'env -u all_proxy -u ALL_PROXY -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY ';
        
        // 1. On tente de pull
        console.log(`  -> Pulling...`);
        execSync(`${envClean} git pull --rebase origin main`, { cwd: fullPath, stdio: 'inherit' });
        
        // 2. On commit s'il y a des changements (le script patch_dev_button a déjà modifié les fichiers)
        console.log(`  -> Committing...`);
        execSync(`git add . && git commit -m "feat: add contact dev button in admin menu" || echo "Nothing to commit"`, { cwd: fullPath, stdio: 'inherit' });
        
        // 3. On push
        console.log(`  -> Pushing...`);
        execSync(`${envClean} git push origin main`, { cwd: fullPath, stdio: 'inherit' });
        
        console.log(`✅ ${botDir}: Synchronisé avec succès.`);
    } catch (e) {
        console.error(`❌ ${botDir}: Erreur:`, e.message);
    }
});

console.log('\n✨ SYNC TERMINÉE !');
