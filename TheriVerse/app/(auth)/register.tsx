import { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isAdult, setIsAdult] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    const isValid = name && email && password && password === confirmPassword && isAdult && acceptTerms;

    const handleRegister = () => {
        router.push('/(auth)/onboarding');
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.content}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <Text style={[styles.title, { color: colors.text }]}>Crear Cuenta</Text>
                    <Text style={[styles.subtitle, { color: colors.textSec }]}>Únete a la comunidad</Text>

                    {/* Name */}
                    <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="person-outline" size={20} color={colors.icon} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Nombre completo"
                            placeholderTextColor={colors.textMut}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

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
                            secureTextEntry
                        />
                    </View>

                    {/* Confirm password */}
                    <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={colors.icon} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Confirmar contraseña"
                            placeholderTextColor={colors.textMut}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </View>

                    {/* Age check */}
                    <TouchableOpacity
                        style={[styles.checkRow, { borderColor: colors.border }]}
                        onPress={() => setIsAdult(!isAdult)}
                    >
                        <Ionicons
                            name={isAdult ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={isAdult ? colors.primary : colors.icon}
                        />
                        <Text style={[styles.checkText, { color: colors.text }]}>
                            Confirmo que tengo 18 años o más
                        </Text>
                    </TouchableOpacity>

                    {/* Terms */}
                    <TouchableOpacity
                        style={[styles.checkRow, { borderColor: colors.border }]}
                        onPress={() => setAcceptTerms(!acceptTerms)}
                    >
                        <Ionicons
                            name={acceptTerms ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={acceptTerms ? colors.primary : colors.icon}
                        />
                        <Text style={[styles.checkText, { color: colors.text }]}>
                            Acepto los <Text style={{ color: colors.primary, fontWeight: '600' }}>Términos de Servicio</Text> y{' '}
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Política de Privacidad</Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Register button */}
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: isValid ? 1 : 0.4 }]}
                        onPress={handleRegister}
                        disabled={!isValid}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryBtnText}>Crear Cuenta</Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSec }]}>¿Ya tenés cuenta? </Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={[styles.footerLink, { color: colors.primary }]}>Iniciar Sesión</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center' },
    content: { padding: 28 },
    backBtn: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, marginTop: 6, marginBottom: 28 },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        borderWidth: 1,
        gap: 12,
    },
    input: { flex: 1, fontSize: 16 },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
    },
    checkText: { flex: 1, fontSize: 14, lineHeight: 20 },
    primaryBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'center' },
    footerText: { fontSize: 14 },
    footerLink: { fontSize: 14, fontWeight: '700' },
});
