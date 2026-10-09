/**
 * Japakeh Post - Categories & Data Store Interface
 * PT Japakeh Media Nusantara
 * Sesuai Rubrikasi Referensi Tabaca.id
 */

const JAPAKEH_CATEGORIES = [
  { id: 'home', name: 'Home', slug: 'home', path: 'index.html' },
  { id: 'nasional', name: 'Nasional', slug: 'nasional', path: 'internasional.html?cat=nasional' },
  { id: 'daerah', name: 'Daerah', slug: 'daerah', path: 'internasional.html?cat=daerah' },
  { id: 'hukum', name: 'Hukum', slug: 'hukum', path: 'internasional.html?cat=hukum' },
  { id: 'politik', name: 'Politik', slug: 'politik', path: 'internasional.html?cat=politik' },
  { id: 'ekonomi', name: 'Ekonomi', slug: 'ekonomi', path: 'internasional.html?cat=ekonomi' },
  { id: 'olahraga', name: 'Olahraga', slug: 'olahraga', path: 'internasional.html?cat=olahraga' },
  { id: 'sosial', name: 'Sosial', slug: 'sosial', path: 'internasional.html?cat=sosial' },
  { id: 'liputan-khusus', name: 'Liputan Khusus', slug: 'liputan-khusus', path: 'internasional.html?cat=liputan-khusus' },
  { id: 'editorial', name: 'Editorial', slug: 'editorial', path: 'internasional.html?cat=editorial' },
  { id: 'bisnis', name: 'Bisnis', slug: 'bisnis', path: 'internasional.html?cat=bisnis' },
  { id: 'pendidikan', name: 'Pendidikan', slug: 'pendidikan', path: 'internasional.html?cat=pendidikan' },
  { id: 'teknologi', name: 'Teknologi', slug: 'teknologi', path: 'internasional.html?cat=teknologi' },
  { id: 'perikanan', name: 'Perikanan', slug: 'perikanan', path: 'internasional.html?cat=perikanan' },
  { id: 'keagamaan', name: 'Keagamaan', slug: 'keagamaan', path: 'internasional.html?cat=keagamaan' },
  { id: 'opini', name: 'Opini', slug: 'opini', path: 'internasional.html?cat=opini' },
  { id: 'foto', name: 'Foto', slug: 'foto', path: 'internasional.html?cat=foto' },
  { id: 'internasional', name: 'Internasional', slug: 'internasional', path: 'internasional.html?cat=internasional' },
  { id: 'video', name: 'Video', slug: 'video', path: 'internasional.html?cat=video' },
  { id: 'tokoh', name: 'Tokoh', slug: 'tokoh', path: 'internasional.html?cat=tokoh' }
];

const BUSER_CATEGORIES = JAPAKEH_CATEGORIES;

const BUSER_ARTICLES = [];

window.NewsDB = {
  getAll() {
    return Array.isArray(BUSER_ARTICLES) ? [...BUSER_ARTICLES] : [];
  },
  getById(id) {
    if (!id) return null;
    return BUSER_ARTICLES.find(a => String(a.id) === String(id) || String(a.id_artikel) === String(id)) || null;
  },
  getBySlug(slug) {
    if (!slug) return null;
    const clean = String(slug).toLowerCase().trim();
    return BUSER_ARTICLES.find(a => (a.slug || '').toLowerCase() === clean) || null;
  },
  getByCategory(catSlug) {
    if (!catSlug || catSlug === 'all') return this.getAll();
    const clean = String(catSlug).toLowerCase().trim();
    return BUSER_ARTICLES.filter(a => {
      const cat = (a.categorySlug || a.category || a.name_kategori || '').toLowerCase();
      return cat.includes(clean) || clean.includes(cat);
    });
  },
  getTrending() {
    return BUSER_ARTICLES.filter(a => a.isTrending);
  },
  getHero() {
    return BUSER_ARTICLES.find(a => a.isHero) || BUSER_ARTICLES[0] || null;
  },
  search(query, cat) {
    let list = this.getAll();
    if (cat && cat !== 'all') {
      list = this.getByCategory(cat);
    }
    if (!query || !query.trim()) return list;
    const q = query.toLowerCase().trim();
    return list.filter(a => {
      const title = (a.title || '').toLowerCase();
      const excerpt = (a.excerpt || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const catName = (a.category || a.name_kategori || '').toLowerCase();
      return title.includes(q) || excerpt.includes(q) || content.includes(q) || catName.includes(q);
    });
  },
  getCategories() {
    return [...JAPAKEH_CATEGORIES];
  }
};
