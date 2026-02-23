import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function SplashScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            router.replace('/(auth)/login');
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.primary }]}>
            <Animated.View
                style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
            >
                <Ionicons name="paw" size={64} color="#FFF" />
                <Text style={styles.logoText}>TheriVerse</Text>
                <Text style={styles.tagline}>Tu universo. Tu manada.</Text>
            </Animated.View>
            <Text style={styles.version}>v1.0.0</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: { alignItems: 'center', gap: 12 },
    logoText: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    version: {
        position: 'absolute',
        bottom: 40,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    },
});
