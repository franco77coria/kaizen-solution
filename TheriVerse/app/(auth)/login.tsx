import { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, Animated, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    const handleLogin = () => {
        router.replace('/(tabs)/feed');
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <Ionicons name="paw" size={40} color={colors.primary} />
                        <Text style={[styles.logo, { color: colors.text }]}>TheriVerse</Text>
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>Iniciar Sesión</Text>
                    <Text style={[styles.subtitle, { color: colors.textSec }]}>
                        Bienvenido de nuevo a la manada
                    </Text>

                    {/* Email */}
                    <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="mail-outline" size={20} color={colors.icon} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Correo electrónico"
                            placeholderTextColor={colors.textMut}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password */}
                    <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.icon} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Contraseña"
                            placeholderTextColor={colors.textMut}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPass}
                        />
                        <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.icon} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.forgotBtn}>
                        <Text style={[styles.forgotText, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>

                    {/* Login button */}
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                        onPress={handleLogin}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryBtnText}>Ingresar</Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerRow}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        <Text style={[styles.dividerText, { color: colors.textMut }]}>o continuar con</Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Google */}
                    <TouchableOpacity
                        style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={20} color={colors.text} />
                        <Text style={[styles.googleBtnText, { color: colors.text }]}>Google</Text>
                    </TouchableOpacity>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSec }]}>¿No tenés cuenta? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text style={[styles.footerLink, { color: colors.primary }]}>Registrarse</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center' },
    content: { padding: 28 },
    logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
    logo: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, marginTop: 6, marginBottom: 32 },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 14,
        borderWidth: 1,
        gap: 12,
    },
    input: { flex: 1, fontSize: 16 },
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
    forgotText: { fontSize: 14, fontWeight: '600' },
    primaryBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { marginHorizontal: 14, fontSize: 13 },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1,
        gap: 10,
        marginBottom: 32,
    },
    googleBtnText: { fontSize: 15, fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'center' },
    footerText: { fontSize: 14 },
    footerLink: { fontSize: 14, fontWeight: '700' },
});
