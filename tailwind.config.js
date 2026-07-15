/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        'mascot-bounce': 'mascot-bounce 0.4s ease-out',
        'mascot-celebrate': 'mascot-celebrate 0.8s ease-in-out infinite',
        'highlight-pulse': 'highlight-pulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'highlight-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 4px rgba(244, 114, 182, 0.6)' },
          '50%': { boxShadow: '0 0 0 8px rgba(244, 114, 182, 0.3)' },
        },
      },
    },
  },
  plugins: [],
}
