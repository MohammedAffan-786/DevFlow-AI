import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border, 215 27.9% 16.9%))',
        background: 'hsl(var(--background, 222.2 84% 4.9%))',
        foreground: 'hsl(var(--foreground, 210 40% 98%))',
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: 'hsl(var(--card, 222.2 84% 4.9%))',
          foreground: 'hsl(var(--card-foreground, 210 40% 98%))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
