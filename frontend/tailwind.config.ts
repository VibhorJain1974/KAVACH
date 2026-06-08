import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: 'var(--void)',
        cosmos: 'var(--cosmos)',
        plasma: 'var(--plasma)',
        solar: 'var(--solar)',
        'aurora-red': 'var(--aurora-red)',
        'aurora-green': 'var(--aurora-green)',
        'aurora-yellow': 'var(--aurora-yellow)',
        'aurora-orange': 'var(--aurora-orange)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
