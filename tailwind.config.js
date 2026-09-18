/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./admin/**/*.html",
    "./assets/js/**/*.js",
    "./admin/js/**/*.js",
    "./backend_ci4/app/Views/**/*.php"
  ],
  safelist: [
    "bg-buser-red",
    "text-buser-red",
    "border-buser-red",
    "hover:bg-buser-redHover",
    "text-white",
    "font-bold",
    "shadow-xs"
  ],
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
  },
  plugins: []
};
