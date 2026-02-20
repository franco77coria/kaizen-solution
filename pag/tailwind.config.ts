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
                // Navy / Dark Blues
                egyptian: '#223F93',
                'outer-space': '#2C3E50',
                indigo: '#2B255B',
                lapis: '#344D77',
                denim: '#1B203D',
                navy: '#001F3F',

                // Medium Blues
                azure: '#3399DD',
                cornflower: '#6C8EC7',
                peacock: '#0E2C36',
                phthalo: '#000F89',
                prussian: '#193366',

                // Teals / Cyans
                tiffany: '#81D8D0',
                teal: '#008080',
                turquoise: '#40E0D0',
                cerulean: '#0095C9',
                'daylight-sky': '#00BFF7',
                ocean: '#01D9D0',

                // Light Blues
                maya: '#10FFEA',
                carolina: '#99BADD',
                electric: '#7DF9FF',
                capri: '#00BFFF',
                sky: '#87CEEB',

                // Grays
                slate: '#708090',
                steel: '#4682B4',
                verdigris: '#43B3AE',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
                heading: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out',
                'slide-up': 'slideUp 0.6s ease-out',
                'slide-down': 'slideDown 0.6s ease-out',
                'scale-in': 'scaleIn 0.4s ease-out',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-hero': 'linear-gradient(135deg, #223F93 0%, #00BFF7 100%)',
                'gradient-card': 'linear-gradient(135deg, #81D8D0 0%, #008080 100%)',
            },
        },
    },
    plugins: [],
};

export default config;
