/**
 * Japakeh Post - Tailwind CSS Central Configuration
 * Konsep Desain: Ruby Crimson (#C8102E), Putih Bersih (#FFFFFF), dan Deep Charcoal Slate (#0F172A)
 * Karakter: Modern Light Editorial, Prestisius, Elegan & Tajam
 * Tagline: Cepat, Akurat, Terpercaya
 */
const japakehTailwindConfig = {
  theme: {
    extend: {
      colors: {
        japakeh: {
          black: '#0F172A',
          red: '#C8102E',
          redHover: '#991B1B',
          dark: '#1E293B',
          light: '#F1F5F9',
          border: '#E2E8F0',
          roseSoft: '#FFF1F2'
        },
        // Alias backward-compatibility agar class legacy beralih mulus ke tema baru
        buser: {
          black: '#0F172A',
          red: '#C8102E',
          redHover: '#991B1B',
          dark: '#1E293B',
          light: '#F1F5F9',
          border: '#E2E8F0',
          roseSoft: '#FFF1F2'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif']
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 12px 24px -4px rgba(15, 23, 42, 0.08)'
      }
    }
  }
};

const buserTailwindConfig = japakehTailwindConfig;

if (typeof tailwind !== 'undefined') {
  tailwind.config = buserTailwindConfig;
} else {
  window.tailwind = { config: buserTailwindConfig };
}

