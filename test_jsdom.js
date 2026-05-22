const { JSDOM } = require('jsdom');

JSDOM.fromURL("http://localhost:8080/catalog?lang=de", {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true
}).then(dom => {
  dom.window.addEventListener('error', e => console.log('ERROR:', e.message));
  dom.window.addEventListener('unhandledrejection', e => console.log('REJECT:', e.reason));
  setTimeout(() => {
    console.log("Done");
    process.exit(0);
  }, 2000);
}).catch(console.error);
