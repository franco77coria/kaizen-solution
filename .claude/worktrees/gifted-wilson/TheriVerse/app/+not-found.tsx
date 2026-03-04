import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: '¡Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Esta pantalla no existe.</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { fontSize: 14 },
});
