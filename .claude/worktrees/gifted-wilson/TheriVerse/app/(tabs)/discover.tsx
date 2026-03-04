import { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Image, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { users, packs, trendingTags } from '../../data/mockData';

export default function DiscoverScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [following, setFollowing] = useState<string[]>([]);

    const toggleFollow = (id: string) => {
        setFollowing(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Explorar</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Search */}
                <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="search" size={18} color={colors.icon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Buscar personas, packs, tags..."
                        placeholderTextColor={colors.textMut}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* Trending */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Tendencias</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
                        {trendingTags.map(tag => (
                            <TouchableOpacity
                                key={tag.tag}
                                style={[styles.trendingTag, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            >
                                <Text style={[styles.tagName, { color: colors.primary }]}>{tag.tag}</Text>
                                <Text style={[styles.tagCount, { color: colors.textMut }]}>{tag.posts} posts</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Suggested People */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Personas sugeridas</Text>
                    <FlatList
                        data={users.slice(0, 5)}
                        horizontal
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const isFollowing = following.includes(item.id);
                            return (
                                <View style={[styles.personCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Image source={{ uri: item.avatar }} style={styles.personAvatar} />
                                    <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                                    <Text style={[styles.personHandle, { color: colors.textMut }]}>{item.handle}</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.followBtn,
                                            isFollowing
                                                ? { backgroundColor: colors.surfaceAlt, borderColor: colors.border }
                                                : { backgroundColor: colors.primary },
                                        ]}
                                        onPress={() => toggleFollow(item.id)}
                                    >
                                        <Text style={[styles.followText, { color: isFollowing ? colors.text : '#FFF' }]}>
                                            {isFollowing ? 'Siguiendo' : 'Seguir'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.peopleScroll}
                    />
                </View>

                {/* Packs */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Packs populares</Text>
                    {packs.map(pack => (
                        <TouchableOpacity
                            key={pack.id}
                            style={[styles.packItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.push(`/pack/${pack.id}` as any)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.packIcon, { backgroundColor: pack.color + '20' }]}>
                                <Text style={styles.packEmoji}>{pack.icon}</Text>
                            </View>
                            <View style={styles.packInfo}>
                                <Text style={[styles.packName, { color: colors.text }]}>{pack.name}</Text>
                                <Text style={[styles.packMeta, { color: colors.textMut }]}>
                                    {pack.members.toLocaleString()} miembros · {pack.category}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.icon} />
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
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    scrollContent: { padding: 16, paddingBottom: 24 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
        marginBottom: 20,
    },
    searchInput: { flex: 1, fontSize: 15 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3 },
    tagsScroll: { gap: 8 },
    trendingTag: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
    },
    tagName: { fontSize: 14, fontWeight: '700' },
    tagCount: { fontSize: 11, marginTop: 2 },
    peopleScroll: { gap: 12 },
    personCard: {
        width: 140,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    personAvatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
    personName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
    personHandle: { fontSize: 12, marginTop: 2, marginBottom: 10 },
    followBtn: {
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    followText: { fontSize: 12, fontWeight: '700' },
    packItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        gap: 12,
    },
    packIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    packEmoji: { fontSize: 22 },
    packInfo: { flex: 1 },
    packName: { fontSize: 15, fontWeight: '700' },
    packMeta: { fontSize: 12, marginTop: 2 },
});
