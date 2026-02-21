/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ludo: {
          red: '#EF4444',
          blue: '#3B82F6',
          green: '#10B981',
          yellow: '#F59E0B',
          safe: '#D1D5DB'
        }
      }
    },
  },
  plugins: [],
}
