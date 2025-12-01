/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'company-blue': '#222943',
        'junior-blue': '#284e8b',
        // Tailwind's default slate is already available, no need to redefine if it's the same.
      },
      fontFamily: {
        sans: [
          'Futura', 
          'system-ui', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          '"Helvetica Neue"', 
          'Arial', 
          '"Noto Sans"', 
          'sans-serif', 
          '"Apple Color Emoji"', 
          '"Segoe UI Emoji"', 
          '"Segoe UI Symbol"', 
          '"Noto Color Emoji"'
        ],
      },
      animation: {
        'progress-bar': 'progressBar 5s linear forwards',
      },
      keyframes: {
        progressBar: {
          'from': { width: '100%' },
          'to': { width: '0%' },
        }
      }
    },
  },
  plugins: [],
}