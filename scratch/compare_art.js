const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const fotoStart = html.indexOf('id="home-foto-section"');
const fotoEnd = html.indexOf('</section>', fotoStart) + 10;
const fotoSec = html.substring(fotoStart, fotoEnd);

const videoStart = html.indexOf('id="home-video-section"');
const videoEnd = html.indexOf('</section>', videoStart) + 10;
const videoSec = html.substring(videoStart, videoEnd);

// Let's inspect the tags inside each article
const fotoArt1 = fotoSec.split('</article>')[0];
const videoArt1 = videoSec.split('</article>')[0];

console.log('--- FOTO ARTICLE 1 ---');
console.log(fotoArt1);
console.log('--- VIDEO ARTICLE 1 ---');
console.log(videoArt1);
