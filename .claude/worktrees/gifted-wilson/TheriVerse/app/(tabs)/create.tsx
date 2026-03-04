import { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const tags = ['#therian', '#furry', '#art', '#commission', '#convention', '#fursuit', '#phantomshift', '#community'];

const visibilityOptions = [
    { id: 'public', icon: 'globe-outline' as const, label: 'Público', desc: 'Cualquiera puede ver' },
    { id: 'followers', icon: 'people-outline' as const, label: 'Seguidores', desc: 'Solo tus seguidores' },
    { id: 'pack', icon: 'shield-outline' as const, label: 'Pack', desc: 'Solo tu manada' },
];

export default function CreatePostScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [visibility, setVisibility] = useState('public');

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handlePost = () => {
        if (!content.trim()) return;
        Alert.alert('Publicado', 'Tu post ha sido compartido con la manada.', [
            { text: 'Genial', onPress: () => router.back() }
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.cancelText, { color: colors.textSec }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo Post</Text>
                <TouchableOpacity
                    style={[styles.postBtn, { backgroundColor: colors.primary, opacity: content.trim() ? 1 : 0.4 }]}
                    onPress={handlePost}
                    disabled={!content.trim()}
                >
                    <Text style={styles.postBtnText}>Publicar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <TextInput
                    style={[styles.textInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                    placeholder="¿Qué estás pensando? Compartí con la manada..."
                    placeholderTextColor={colors.textMut}
                    multiline
                    value={content}
                    onChangeText={setContent}
                    textAlignVertical="top"
                    autoFocus
                />

                {/* Attach */}
                <View style={styles.attachRow}>
                    {[
                        { icon: 'image-outline' as const, label: 'Foto' },
                        { icon: 'videocam-outline' as const, label: 'Video' },
                        { icon: 'stats-chart-outline' as const, label: 'Encuesta' },
                    ].map(item => (
                        <TouchableOpacity
                            key={item.label}
                            style={[styles.attachBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                            <Ionicons name={item.icon} size={22} color={colors.icon} />
                            <Text style={[styles.attachLabel, { color: colors.textSec }]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tags */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Etiquetas</Text>
                    <View style={styles.tagGrid}>
                        {tags.map(tag => (
                            <TouchableOpacity
                                key={tag}
                                style={[
                                    styles.tagChip,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    selectedTags.includes(tag) && { borderColor: colors.primary, backgroundColor: colors.primaryLight + '15' },
                                ]}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={[
                                    styles.tagText,
                                    { color: selectedTags.includes(tag) ? colors.primary : colors.textSec },
                                ]}>
                                    {tag}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Visibility */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Visibilidad</Text>
                    {visibilityOptions.map(opt => (
                        <TouchableOpacity
                            key={opt.id}
                            style={[
                                styles.visOption,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                visibility === opt.id && { borderColor: colors.primary, backgroundColor: colors.primaryLight + '15' },
                            ]}
                            onPress={() => setVisibility(opt.id)}
                        >
                            <Ionicons name={opt.icon} size={20} color={visibility === opt.id ? colors.primary : colors.icon} />
                            <View style={styles.visInfo}>
                                <Text style={[styles.visLabel, { color: colors.text }]}>{opt.label}</Text>
                                <Text style={[styles.visDesc, { color: colors.textMut }]}>{opt.desc}</Text>
                            </View>
                            {visibility === opt.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </View>
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
    cancelText: { fontSize: 15, fontWeight: '600' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    postBtn: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
    postBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    scrollContent: { flex: 1, padding: 16 },
    textInput: {
        fontSize: 16,
        lineHeight: 24,
        minHeight: 140,
        borderRadius: 14,
        padding: 18,
        borderWidth: 1,
    },
    attachRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
    attachBtn: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
    },
    attachLabel: { fontSize: 11, fontWeight: '600' },
    section: { marginTop: 24 },
    sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
    tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
    tagText: { fontSize: 13, fontWeight: '600' },
    visOption: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1.5,
        gap: 12,
    },
    visInfo: { flex: 1 },
    visLabel: { fontSize: 15, fontWeight: '600' },
    visDesc: { fontSize: 12, marginTop: 1 },
});
