import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingItem {
    icon: IoniconsName;
    label: string;
    desc: string;
}

interface SettingSection {
    title: string;
    items: SettingItem[];
}

const settingsSections: SettingSection[] = [
    {
        title: 'Cuenta',
        items: [
            { icon: 'mail-outline', label: 'Email y Contraseña', desc: 'Cambiá tus credenciales' },
            { icon: 'link-outline', label: 'Cuentas Vinculadas', desc: 'Google Sign-In' },
            { icon: 'phone-portrait-outline', label: 'Sesiones Activas', desc: 'Gestioná tus dispositivos' },
        ],
    },
    {
        title: 'Privacidad y Seguridad',
        items: [
            { icon: 'eye-outline', label: 'Visibilidad del Perfil', desc: 'Quién puede verte' },
            { icon: 'lock-closed-outline', label: 'Privacidad Dating', desc: 'Modo incógnito, filtros' },
            { icon: 'ban-outline', label: 'Usuarios Bloqueados', desc: 'Gestioná bloqueos' },
            { icon: 'shield-outline', label: 'Filtros de Contenido', desc: 'Contenido para adultos' },
        ],
    },
    {
        title: 'Notificaciones',
        items: [
            { icon: 'notifications-outline', label: 'Push Notifications', desc: 'Mensajes, likes, seguidores' },
            { icon: 'mail-unread-outline', label: 'Notificaciones Email', desc: 'Resúmenes y alertas' },
        ],
    },
    {
        title: 'Suscripción',
        items: [
            { icon: 'diamond-outline', label: 'Dating Premium', desc: 'Gestionar suscripción' },
            { icon: 'rocket-outline', label: 'Boosts y Superlikes', desc: 'Comprar extras' },
        ],
    },
    {
        title: 'Soporte',
        items: [
            { icon: 'help-circle-outline', label: 'Centro de Ayuda', desc: 'FAQ y guías' },
            { icon: 'bug-outline', label: 'Reportar un Bug', desc: 'Ayudanos a mejorar' },
            { icon: 'document-text-outline', label: 'Normas de la Comunidad', desc: 'Leé nuestras reglas' },
            { icon: 'reader-outline', label: 'Términos de Servicio', desc: 'Información legal' },
            { icon: 'finger-print-outline', label: 'Política de Privacidad', desc: 'Tu privacidad importa' },
        ],
    },
];

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, mode, setMode, isDark } = useTheme();

    const handleLogout = () => {
        Alert.alert('Cerrar Sesión', '¿Estás seguro de que querés salir?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: () => router.replace('/(auth)/login') },
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Configuración</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Dark Mode Toggle */}
                <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.themeRow}>
                        <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={22} color={colors.primary} />
                        <View style={styles.themeInfo}>
                            <Text style={[styles.themeLabel, { color: colors.text }]}>Modo Oscuro</Text>
                            <Text style={[styles.themeDesc, { color: colors.textMut }]}>
                                {isDark ? 'Activado' : 'Desactivado'}
                            </Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={(v) => setMode(v ? 'dark' : 'light')}
                            trackColor={{ false: colors.border, true: colors.primaryLight }}
                            thumbColor={isDark ? colors.primary : '#FFFFFF'}
                        />
                    </View>
                </View>

                {/* Settings Sections */}
                {settingsSections.map(section => (
                    <View key={section.title} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textMut }]}>{section.title}</Text>
                        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                            {section.items.map((item, i) => (
                                <TouchableOpacity
                                    key={item.label}
                                    style={[
                                        styles.settingItem,
                                        i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={item.icon} size={20} color={colors.icon} />
                                    <View style={styles.settingInfo}>
                                        <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                                        <Text style={[styles.settingDesc, { color: colors.textMut }]}>{item.desc}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textMut} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Export / Logout / Delete */}
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="download-outline" size={20} color={colors.text} />
                    <Text style={[styles.actionText, { color: colors.text }]}>Exportar Mis Datos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Cerrar Sesión</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? '#2A1A1A' : '#FFF0F0', borderColor: isDark ? '#3D2222' : '#FFD0D0' }]}
                    onPress={() => router.push('/settings/delete-account' as any)}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={[styles.actionText, { color: colors.error }]}>Eliminar Cuenta</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: colors.textMut }]}>TheriVerse v1.0.0 MVP</Text>
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
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    themeCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    themeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    themeInfo: { flex: 1 },
    themeLabel: { fontSize: 16, fontWeight: '700' },
    themeDesc: { fontSize: 12, marginTop: 1 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
    sectionCard: { borderRadius: 16, overflow: 'hidden' },
    settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    settingInfo: { flex: 1 },
    settingLabel: { fontSize: 15, fontWeight: '600' },
    settingDesc: { fontSize: 12, marginTop: 1 },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        padding: 16,
        gap: 8,
        borderWidth: 1,
        marginBottom: 10,
    },
    actionText: { fontSize: 15, fontWeight: '700' },
    version: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});
