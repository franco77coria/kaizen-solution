import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

ExpoSplashScreen.preventAutoHideAsync();

function AppStack() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    ExpoSplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="post/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="pack/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="dating" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="report" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  );
}
