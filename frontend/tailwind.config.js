/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                fontFamily: {
                        heading: ['Manrope', 'sans-serif'],
                        body: ['IBM Plex Sans', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                        sans: ['IBM Plex Sans', 'sans-serif']
                },
                letterSpacing: {
                        tighter: '-0.02em'
                },
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        diff: {
                                added: {
                                        text: 'hsl(var(--diff-added-text))',
                                        bg: 'hsl(var(--diff-added-bg))',
                                        border: 'hsl(var(--diff-added-border))'
                                },
                                removed: {
                                        text: 'hsl(var(--diff-removed-text))',
                                        bg: 'hsl(var(--diff-removed-bg))',
                                        border: 'hsl(var(--diff-removed-border))'
                                },
                                modified: {
                                        text: 'hsl(var(--diff-modified-text))',
                                        bg: 'hsl(var(--diff-modified-bg))',
                                        border: 'hsl(var(--diff-modified-border))'
                                }
                        }
                },
                keyframes: {
                        'accordion-down': {
                                from: {
                                        height: '0'
                                },
                                to: {
                                        height: 'var(--radix-accordion-content-height)'
                                }
                        },
                        'accordion-up': {
                                from: {
                                        height: 'var(--radix-accordion-content-height)'
                                },
                                to: {
                                        height: '0'
                                }
                        },
                        'fade-in': {
                                from: { opacity: '0', transform: 'translateY(4px)' },
                                to: { opacity: '1', transform: 'translateY(0)' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'fade-in': 'fade-in 0.2s ease-out'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
