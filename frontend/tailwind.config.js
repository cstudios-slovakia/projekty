/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cstudios-orange': '#e78b01',
        'cstudios-green': '#00b800',
        'cstudios-grey': '#8a8c89',
      }
    },
  },
  plugins: [],
}
