const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const requiredIds = [
  'breaking-ticker-track',
  'home-hero-card',
  'home-hero-link',
  'home-hero-img',
  'home-hero-category',
  'home-hero-title',
  'home-hero-excerpt',
  'home-hero-date',
  'hero-carousel-dots',
  'hero-prev-btn',
  'hero-next-btn',
  'home-berita-terbaru-grid',
  'home-populer-grid',
  'home-foto-grid',
  'home-foto-section',
  'home-video-grid',
  'home-video-section',
  'video-modal',
  'close-video-modal-btn',
  'video-modal-backdrop',
  'video-modal-player-container',
  'video-modal-title',
  'video-modal-date',
  'video-modal-author',
  'video-modal-desc',
  'video-modal-link',
  'foto-modal',
  'close-foto-modal-btn',
  'foto-modal-backdrop',
  'foto-modal-img',
  'foto-modal-title',
  'foto-modal-date',
  'foto-modal-author',
  'foto-modal-desc',
  'foto-modal-link'
];

let missing = [];
requiredIds.forEach(id => {
  if (!html.includes('id="' + id + '"')) {
    missing.push(id);
  }
});

console.log('Checked', requiredIds.length, 'IDs.');
if (missing.length === 0) {
  console.log('All IDs found successfully!');
} else {
  console.log('Missing IDs:', missing);
}
