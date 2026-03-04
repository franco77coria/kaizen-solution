import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LightTheme, DarkTheme, ThemeColors } from '../constants/Colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    colors: ThemeColors;
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    colors: LightTheme,
    mode: 'light',
    isDark: false,
    setMode: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('light');

    const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
    const colors = isDark ? DarkTheme : LightTheme;

    return (
        <ThemeContext.Provider value={{ colors, mode, isDark, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
