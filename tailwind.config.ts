import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas, #ffffff)',
        'canvas-soft': 'var(--canvas-soft, #fafafa)',
        'canvas-soft-2': 'var(--canvas-soft-2, #f5f5f5)',
        ink: 'var(--ink, #171717)',
        'ink-body': 'var(--ink-body, #4d4d4d)',
        'ink-mute': 'var(--ink-mute, #888888)',
        'on-primary': '#ffffff',
        hairline: 'var(--hairline, #ebebeb)',
        'hairline-strong': 'var(--hairline-strong, #a1a1a1)',
        'brand-link': '#0070f3',
        'brand-link-deep': '#0761d1',
        'brand-error': '#ee0000',
        'brand-error-soft': '#f7d4d6',
        'brand-warning': '#f5a623',
        'brand-warning-soft': '#ffefcf',
        'brand-cyan': '#50e3c2',
        'brand-pink': '#ff0080',
        'brand-violet': '#7928ca',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        'pill-sm': '64px',
        pill: '100px',
      },
      boxShadow: {
        'level-1': '0 0 0 1px rgba(0, 0, 0, 0.08)',
        'level-2': '0 0 0 1px rgba(0, 0, 0, 0.08), 0px 1px 1px rgba(0, 0, 0, 0.02), 0px 2px 2px rgba(0, 0, 0, 0.04)',
        'level-3': '0 0 0 1px rgba(0, 0, 0, 0.08), 0px 2px 2px rgba(0, 0, 0, 0.04), 0px 8px 8px -8px rgba(0, 0, 0, 0.04)',
        'level-5': '0 0 0 1px rgba(0, 0, 0, 0.08), 0px 1px 1px rgba(0, 0, 0, 0.02), 0px 8px 16px -4px rgba(0, 0, 0, 0.04), 0px 24px 32px -8px rgba(0, 0, 0, 0.06)',
      },
      letterSpacing: {
        'tight-hero': '-2.4px',
        'tight-lg': '-1.28px',
        'tight-md': '-0.96px',
        'tight-sm': '-0.6px',
        'tight-body': '-0.28px',
      },
    },
  },
  plugins: [],
};

export default config;
