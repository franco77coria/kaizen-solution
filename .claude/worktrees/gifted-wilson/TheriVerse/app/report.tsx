import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const reportReasons = [
    'Spam o información engañosa',
    'Acoso o bullying',
    'Discurso de odio o símbolos',
    'Desnudez o contenido sexual',
    'Violencia u organizaciones peligrosas',
    'Estafa o fraude',
    'Violación de propiedad intelectual',
    'Otro',
];

export default function ReportScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [details, setDetails] = useState('');

    const handleReport = () => {
        if (!selectedReason) {
            Alert.alert('Seleccioná un motivo', 'Por favor seleccioná el motivo del reporte.');
            return;
        }
        Alert.alert(
            'Reporte Recibido',
            'Gracias por mantener TheriVerse segura. Nuestro equipo de moderación lo revisará pronto.',
            [{ text: 'Listo', onPress: () => router.back() }]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.cancelText, { color: colors.textSec }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Reportar</Text>
                <TouchableOpacity onPress={handleReport} disabled={!selectedReason}>
                    <Text style={[styles.submitText, { color: selectedReason ? colors.primary : colors.textMut }]}>Enviar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.subtitle, { color: colors.text }]}>¿Por qué reportás esto?</Text>
                <Text style={[styles.desc, { color: colors.textSec }]}>Tu reporte es anónimo y ayuda a mantener nuestra comunidad segura.</Text>

                <View style={[styles.reasonsList, { backgroundColor: colors.card }]}>
                    {reportReasons.map(reason => (
                        <TouchableOpacity
                            key={reason}
                            style={[
                                styles.reasonItem,
                                { borderBottomColor: colors.borderLight },
                                selectedReason === reason && { backgroundColor: colors.primaryLight + '15' },
                            ]}
                            onPress={() => setSelectedReason(reason)}
                        >
                            <Text style={[styles.reasonText, { color: selectedReason === reason ? colors.primary : colors.text }]}>
                                {reason}
                            </Text>
                            {selectedReason === reason && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Detalles Adicionales (Opcional)</Text>
                <TextInput
                    style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                    placeholder="Proporcioná más contexto..."
                    placeholderTextColor={colors.textMut}
                    multiline
                    value={details}
                    onChangeText={setDetails}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 52,
        borderBottomWidth: 1,
    },
    cancelText: { fontSize: 15, fontWeight: '600' },
    submitText: { fontSize: 15, fontWeight: '700' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    content: { padding: 20 },
    subtitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    desc: { fontSize: 14, marginBottom: 24 },
    reasonsList: { borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
    reasonItem: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reasonText: { fontSize: 15 },
    label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    input: { borderRadius: 12, padding: 16, fontSize: 15, borderWidth: 1, minHeight: 100, textAlignVertical: 'top' },
});
