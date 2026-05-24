const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf-8');

const oldNews = `    app.get('/api/news', async (req, res) => {
        try {
            const { getBroadcastHistory } = require('./services/database');
            const news = await getBroadcastHistory(10);
            res.json(news.filter(b => b.status === 'completed'));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });`;

const newNews = `    app.get('/api/news', async (req, res) => {
        try {
            const { getBroadcastHistory } = require('./services/database');
            const news = await getBroadcastHistory(10);
            let filteredNews = news.filter(b => b.status === 'completed');
            
            const lang = req.query.lang || 'fr';
            if (lang !== 'fr') {
                const { translate } = require('./services/translator');
                filteredNews = await Promise.all(filteredNews.map(async b => {
                    const translatedMsg = await translate(b.message || '', lang);
                    return { ...b, message: translatedMsg };
                }));
            }
            res.json(filteredNews);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });`;

if (content.includes(oldNews)) {
    content = content.replace(oldNews, newNews);
    fs.writeFileSync('server.js', content, 'utf-8');
    print("Patched /api/news");
} else {
    console.log("Could not find exact block to replace.");
}
