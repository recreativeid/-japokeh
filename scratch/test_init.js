const fs = require('fs');

global.window = {
  location: { origin: 'http://localhost', pathname: '/' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
};

const newsData = fs.readFileSync('assets/js/news-data.js', 'utf8') + '; global.NewsDB = window.NewsDB;';
eval(newsData);

const apiClient = fs.readFileSync('assets/js/api-client.js', 'utf8');
eval(apiClient);

global.document = {
  addEventListener: () => {},
  querySelectorAll: () => [],
  getElementById: (id) => {
    return {
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      addEventListener: () => {},
      querySelectorAll: () => []
    };
  }
};

const homeLive = fs.readFileSync('assets/js/home-live.js', 'utf8') + '; global.initHomePage = initHomePage;';
eval(homeLive);

global.initHomePage().then(() => {
  console.log('initHomePage completed successfully without any error!');
}).catch(err => {
  console.error('ERROR in initHomePage:', err);
});
