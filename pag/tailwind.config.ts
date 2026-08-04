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
                // #00BFF7 rinde 8.91:1 sobre #0a0f1e pero solo 2.14:1 sobre
                // blanco. Este es el mismo acento para TEXTO sobre fondo claro
                // (5.36:1). Para fondos, bordes e iconos seguí usando daylight-sky.
                'accent-ink': '#0E7490',
                ocean: '#01D9D0',

                // Light Blues
                maya: '#10FFEA',
                carolina: '#99BADD',
                electric: '#7DF9FF',
                capri: '#00BFFF',
                sky: '#87CEEB',

                // Grays
                // #708090 daba 4.05:1 sobre blanco — abajo del mínimo AA para
                // texto normal. #5A6473 mantiene el gris frío y da 5.99:1.
                slate: '#5A6473',
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
                // Reemplaza el motion.div del indicador de scroll del hero
                'bounce-slow': 'bounceSlow 2.2s ease-in-out infinite',
                // Punto pulsante del launcher del chat
                'ping-slow': 'pingSlow 2.5s ease-in-out infinite',
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
                bounceSlow: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(10px)' },
                },
                pingSlow: {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.3)' },
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
