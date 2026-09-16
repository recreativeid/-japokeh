const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'api', 'articles-seed.json');
const newsDataPath = path.join(__dirname, '..', 'assets', 'js', 'news-data.js');

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const newItems = [
  {
    id: 46,
    title: '[VIDEO] Penanganan Cepat Tanggap Banjir Pidie Jaya dan Bantuan Dapur Umum',
    slug: 'video-penanganan-cepat-tanggap-banjir-pidie-jaya-dan-bantuan-dapur-umum',
    excerpt: 'MEUREUDU — Video dokumentasi penyaluran bantuan pangan darurat dan evakuasi lansia di posko pengungsian terpadu Pidie Jaya pasca luapan air sungai surut perlahan.',
    content: '<p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4"><strong>MEUREUDU</strong> — Tim tanggap darurat BPBD bersama relawan kemanusiaan bahu-membahu mendirikan dapur umum lapangan dan mendistribusikan kebutuhan sanitasi bagi ribuan warga terdampak banjir di Pidie Jaya.</p><p class="mb-4 text-gray-700 leading-relaxed">Kondisi terkini menunjukkan genangan air di sejumlah titik telah berangsur surut, namun aparat tetap mengimbau masyarakat untuk mewaspadai potensi curah hujan susulan.</p>',
    image: 'assets/images/berita/daerah/revitalisasi-pelabuhan-banyuasin.jpg',
    category: 'Video',
    categorySlug: 'video',
    author: 'Al Bahri',
    authorRole: 'Redaksi Japakeh Post',
    views: '3.420',
    shares: '340',
    date: 'Thursday, 10 September 2026',
    time: '16:15 WIB',
    readTime: '2 menit tonton',
    isHero: false,
    isTrending: true,
    trendingRank: 4,
    timestamp: 1789031700000,
    tags: ['Video', 'Banjir', 'Pidie Jaya', 'Terkini']
  },
  {
    id: 47,
    title: '[VIDEO] Semarak Latihan Perdana Skuad PSP Pidie Jaya Menuju Liga 3 Aceh',
    slug: 'video-semarak-latihan-perdana-skuad-psp-pidie-jaya-menuju-liga-3-aceh',
    excerpt: 'TRIENGGADENG — Liputan video eksklusif sesi latihan perdana para talenta muda PSP Pidie Jaya di bawah arahan pelatih kepala guna mematangkan taktik dan fisik jelang kick-off kompetisi.',
    content: '<p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4"><strong>TRIENGGADENG</strong> — Skuad kebanggaan masyarakat Pidie Jaya, PSP Pidie Jaya, resmi menggelar pemusatan latihan intensif guna mempersiapkan formasi tempur menghadapi ketatnya persaingan Liga 3 zona Aceh.</p><p class="mb-4 text-gray-700 leading-relaxed">Ratusan suporter turut hadir di pinggir lapangan memberikan suntikan motivasi moril bagi para pemain muda lokal yang menjadi tumpuan harapan daerah.</p>',
    image: 'assets/images/berita/olahraga/pekan-olahraga-nasional.jpg',
    category: 'Video',
    categorySlug: 'video',
    author: 'Kevin Adityawarman',
    authorRole: 'Redaksi Japakeh Post',
    views: '4.150',
    shares: '520',
    date: 'Thursday, 10 September 2026',
    time: '11:30 WIB',
    readTime: '3 menit tonton',
    isHero: false,
    isTrending: false,
    trendingRank: 8,
    timestamp: 1789014600000,
    tags: ['Video', 'Olahraga', 'PSP Pidie Jaya', 'Liga 3']
  },
  {
    id: 48,
    title: '[FOTO] Pesona Karnaval Adat dan Budaya Gampong Pesisir Aceh',
    slug: 'foto-pesona-karnaval-adat-dan-budaya-gampong-pesisir-aceh',
    excerpt: 'MEUREUDU — Deretan foto warna-warni busana tradisional adat Aceh dan parade perahu hias nelayan memukau ribuan penonton dalam pagelaran festival pesisir tahun 2026.',
    content: '<p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4"><strong>MEUREUDU</strong> — Ribuan masyarakat antusias menyaksikan karnaval ragam budaya lokal yang menampilkan busana kebesaran adat Aceh dan atraksi kesenian tradisional pesisir.</p><p class="mb-4 text-gray-700 leading-relaxed">Festival tahunan ini diinisiasi untuk menjaga kelestarian warisan budaya indatu sekaligus membangkitkan sektor pariwisata daerah.</p>',
    image: 'assets/images/berita/daerah/festival-budaya-palembang.jpg',
    category: 'Foto',
    categorySlug: 'foto',
    author: 'Al Bahri',
    authorRole: 'Redaksi Japakeh Post',
    views: '21.300',
    shares: '610',
    date: 'Friday, 11 September 2026',
    time: '14:15 WIB',
    readTime: '2 menit lihat',
    isHero: false,
    isTrending: false,
    trendingRank: 15,
    timestamp: 1789136100000,
    tags: ['Foto', 'Budaya', 'Pidie Jaya', 'Karnaval']
  }
];

// Update seed
for (const item of newItems) {
  if (!seed.some(s => s.id === item.id || s.slug === item.slug)) {
    seed.push(item);
  }
}
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 4), 'utf8');
console.log('Seed updated! Total articles:', seed.length);

// Update news-data.js
let newsDataCode = fs.readFileSync(newsDataPath, 'utf8');
// Check if video 46 & 47 are in BUSER_ARTICLES
if (!newsDataCode.includes('video-penanganan-cepat-tanggap-banjir-pidie-jaya')) {
  // Find where BUSER_ARTICLES array starts
  const searchStr = 'const BUSER_ARTICLES = [';
  const insertIndex = newsDataCode.indexOf(searchStr);
  if (insertIndex !== -1) {
    const afterOpen = insertIndex + searchStr.length;
    const jsonStr = '\n' + newItems.map(item => '    ' + JSON.stringify(item, null, 4).replace(/\n/g, '\n    ') + ',').join('\n');
    newsDataCode = newsDataCode.slice(0, afterOpen) + jsonStr + newsDataCode.slice(afterOpen);
    fs.writeFileSync(newsDataPath, newsDataCode, 'utf8');
    console.log('news-data.js updated with new video and foto items!');
  }
} else {
  console.log('news-data.js already has the items.');
}
