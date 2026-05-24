const fs = require('fs');
const cheerio = require('cheerio');
const acorn = require('acorn');

const html = fs.readFileSync('web/views/catalog.html', 'utf8');
const $ = cheerio.load(html);

$('script').each((i, el) => {
    const code = $(el).html();
    if (code) {
        try {
            acorn.parse(code, { ecmaVersion: 2020 });
            console.log(`Script ${i} syntax OK.`);
        } catch (e) {
            console.error(`Script ${i} syntax error:`, e.message);
            // Print the lines around the error
            const lines = code.split('\n');
            const loc = e.loc;
            if (loc) {
                console.error('Line ' + loc.line + ': ' + lines[loc.line - 1]);
                console.error(' '.repeat(loc.column + 8) + '^');
            }
        }
    }
});
