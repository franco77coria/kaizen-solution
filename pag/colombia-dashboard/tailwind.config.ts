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
                primary: {
                    DEFAULT: "hsl(18, 100%, 60%)", // Naranja Cambio Radical
                    50: "hsl(18, 100%, 95%)",
                    100: "hsl(18, 100%, 90%)",
                    200: "hsl(18, 100%, 80%)",
                    300: "hsl(18, 100%, 70%)",
                    400: "hsl(18, 100%, 65%)",
                    500: "hsl(18, 100%, 60%)",
                    600: "hsl(18, 100%, 50%)",
                    700: "hsl(18, 90%, 45%)",
                    800: "hsl(18, 80%, 40%)",
                    900: "hsl(18, 70%, 35%)",
                },
                secondary: {
                    DEFAULT: "hsl(220, 70%, 35%)", // Azul institucional
                    50: "hsl(220, 70%, 95%)",
                    100: "hsl(220, 70%, 85%)",
                    200: "hsl(220, 70%, 75%)",
                    300: "hsl(220, 70%, 65%)",
                    400: "hsl(220, 70%, 55%)",
                    500: "hsl(220, 70%, 45%)",
                    600: "hsl(220, 70%, 35%)",
                    700: "hsl(220, 70%, 25%)",
                    800: "hsl(220, 70%, 20%)",
                    900: "hsl(220, 70%, 15%)",
                },
                accent: "hsl(25, 95%, 53%)",
                background: "hsl(220, 20%, 8%)",
                surface: "hsl(220, 15%, 12%)",
                "text-primary": "hsl(0, 0%, 98%)",
                "text-secondary": "hsl(220, 10%, 70%)",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                display: ["Montserrat", "Inter", "sans-serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "glass": "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
            },
            backdropBlur: {
                xs: "2px",
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-in-out",
                "slide-up": "slideUp 0.5s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
