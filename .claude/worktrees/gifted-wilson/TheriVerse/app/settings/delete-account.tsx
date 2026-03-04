import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function DeleteAccountScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [confirmation, setConfirmation] = useState('');
    const [reason, setReason] = useState('');

    const handleDelete = () => {
        if (confirmation !== 'ELIMINAR') {
            Alert.alert('Confirmación incorrecta', 'Escribí ELIMINAR en mayúsculas para confirmar.');
            return;
        }
        Alert.alert(
            'Eliminación Permanente',
            '¿Estás completamente seguro? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive',
                    onPress: () => {
                        Alert.alert('Cuenta Eliminada', 'Tu cuenta fue eliminada exitosamente.', [
                            { text: 'OK', onPress: () => router.replace('/(auth)/login') },
                        ]);
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={[styles.warningBox, { backgroundColor: isDark ? '#2A1A1A' : '#FFF0F0', borderColor: isDark ? '#3D2222' : '#FFD0D0' }]}>
                <Ionicons name="warning-outline" size={32} color={colors.error} />
                <Text style={[styles.warningTitle, { color: colors.error }]}>Acción Irreversible</Text>
                <Text style={[styles.warningText, { color: isDark ? '#FF8A80' : '#D32F2F' }]}>
                    Al eliminar tu cuenta se borrarán permanentemente:{'\n'}
                    • Tu perfil y capas de identidad{'\n'}
                    • Todos tus posts y comentarios{'\n'}
                    • Tus mensajes y membresías de packs{'\n'}
                    • Tu suscripción Dating Premium
                </Text>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>¿Por qué te vas? (Opcional)</Text>
            <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholder="Contanos cómo podemos mejorar..."
                placeholderTextColor={colors.textMut}
                multiline
                value={reason}
                onChangeText={setReason}
            />

            <Text style={[styles.label, { color: colors.text }]}>Escribí "ELIMINAR" para confirmar</Text>
            <TextInput
                style={[styles.confirmInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                placeholder="ELIMINAR"
                placeholderTextColor={colors.textMut}
                value={confirmation}
                onChangeText={setConfirmation}
                autoCapitalize="characters"
            />

            <TouchableOpacity
                style={[styles.deleteBtn, confirmation !== 'ELIMINAR' && styles.deleteBtnDisabled]}
                onPress={handleDelete}
                disabled={confirmation !== 'ELIMINAR'}
            >
                <Text style={styles.deleteBtnText}>Eliminar Cuenta Permanentemente</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    backBtn: { marginBottom: 20, paddingTop: 40 },
    warningBox: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 24, alignItems: 'center', gap: 8 },
    warningTitle: { fontSize: 18, fontWeight: '700' },
    warningText: { fontSize: 14, lineHeight: 22 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 12 },
    input: { borderRadius: 12, padding: 16, fontSize: 15, borderWidth: 1, minHeight: 100, textAlignVertical: 'top' },
    confirmInput: { borderRadius: 12, padding: 16, fontSize: 15, borderWidth: 1, letterSpacing: 2, fontWeight: '700' },
    deleteBtn: {
        backgroundColor: '#FF3D57',
        borderRadius: 14,
        padding: 18,
        alignItems: 'center',
        marginTop: 32,
    },
    deleteBtnDisabled: { opacity: 0.4 },
    deleteBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
