import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { packs, posts } from '../../data/mockData';

export default function PackDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const pack = packs.find(p => p.id === id) || packs[0];
    const packPosts = posts.slice(0, 3);

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <ScrollView>
                {/* Banner */}
                <View style={[styles.banner, { backgroundColor: pack.color }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                        <Text style={styles.packEmoji}>{pack.icon}</Text>
                    </View>
                </View>

                <View style={styles.content}>
                    <Text style={[styles.packName, { color: colors.text }]}>{pack.name}</Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.memberCount, { color: colors.textSec }]}>
                            {pack.members.toLocaleString()} miembros
                        </Text>
                        <View style={[styles.dot, { backgroundColor: colors.textMut }]} />
                        <Text style={[styles.category, { color: colors.primary }]}>{pack.category}</Text>
                    </View>
                    <Text style={[styles.description, { color: colors.textMut }]}>{pack.description}</Text>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
                            <Text style={styles.joinText}>{pack.isJoined ? 'Unido' : 'Unirse'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.inviteBtn, { borderColor: colors.border }]}>
                            <Text style={[styles.inviteText, { color: colors.text }]}>Invitar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Rules */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="document-text-outline" size={18} color={colors.icon} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reglas del Pack</Text>
                        </View>
                        <View style={[styles.rulesCard, { backgroundColor: colors.card }]}>
                            <Text style={[styles.rule, { color: colors.textSec }]}>1. Respetar a todos los miembros</Text>
                            <Text style={[styles.rule, { color: colors.textSec }]}>2. Sin discursos de odio ni drama</Text>
                            <Text style={[styles.rule, { color: colors.textSec }]}>3. Contenido PG-13</Text>
                        </View>
                    </View>

                    {/* Discussion */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="chatbubble-outline" size={18} color={colors.icon} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Discusión</Text>
                        </View>
                        {packPosts.map(post => (
                            <View key={post.id} style={[styles.postMini, { backgroundColor: colors.card }]}>
                                <Image source={{ uri: post.userAvatar }} style={styles.postAvatar} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.postUser, { color: colors.text }]}>{post.userName}</Text>
                                    <Text style={[styles.postText, { color: colors.textSec }]} numberOfLines={2}>{post.content}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    banner: { height: 140, justifyContent: 'flex-end', alignItems: 'center' },
    backBtn: { position: 'absolute', top: 50, left: 16 },
    iconBox: {
        width: 72, height: 72, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: -36,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    packEmoji: { fontSize: 36 },
    content: { paddingTop: 46, paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
    packName: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    memberCount: { fontSize: 13, fontWeight: '600' },
    dot: { width: 4, height: 4, borderRadius: 2 },
    category: { fontSize: 13, fontWeight: '700' },
    description: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    joinBtn: { paddingVertical: 10, paddingHorizontal: 32, borderRadius: 20 },
    joinText: { color: '#FFF', fontWeight: '700' },
    inviteBtn: { paddingVertical: 10, paddingHorizontal: 32, borderRadius: 20, borderWidth: 1 },
    inviteText: { fontWeight: '600' },
    section: { marginTop: 28, width: '100%' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    rulesCard: { borderRadius: 16, padding: 16, gap: 12 },
    rule: { fontSize: 14 },
    postMini: { flexDirection: 'row', borderRadius: 14, padding: 12, marginBottom: 10, gap: 12 },
    postAvatar: { width: 40, height: 40, borderRadius: 20 },
    postUser: { fontSize: 14, fontWeight: '700' },
    postText: { fontSize: 13, marginTop: 2 },
});
