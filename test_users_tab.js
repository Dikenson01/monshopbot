const puppeteer = require('puppeteer');
require('dotenv').config();

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login');
    
    // Login
    await page.type('#username', process.env.ADMIN_USERNAME || 'admin');
    await page.type('#password', process.env.ADMIN_PASSWORD || 'password');
    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation()
    ]);
    
    console.log("Navigated to dashboard. Waiting 2s...");
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Clicking Utilisateurs tab...");
    await page.evaluate(() => {
        switchSection('users');
    });
    
    await new Promise(r => setTimeout(r, 3000));
    console.log("Done.");
    await browser.close();
})();
