const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const fotoStart = html.indexOf('id="home-foto-section"');
const fotoEnd = html.indexOf('</section>', fotoStart) + 10;
const fotoSec = html.substring(fotoStart, fotoEnd);

const videoStart = html.indexOf('id="home-video-section"');
const videoEnd = html.indexOf('</section>', videoStart) + 10;
const videoSec = html.substring(videoStart, videoEnd);

console.log('Foto Sec Length:', fotoSec.length);
console.log('Video Sec Length:', videoSec.length);

const re = /<article[^>]*class="([^"]*)"/g;
let m;
const fotoClasses = [];
while ((m = re.exec(fotoSec)) !== null) fotoClasses.push(m[1]);

const re2 = /<article[^>]*class="([^"]*)"/g;
const videoClasses = [];
while ((m = re2.exec(videoSec)) !== null) videoClasses.push(m[1]);

console.log('Foto Classes:', fotoClasses);
console.log('Video Classes:', videoClasses);
