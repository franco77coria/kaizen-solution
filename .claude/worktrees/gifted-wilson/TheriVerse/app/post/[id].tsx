import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { posts } from '../../data/mockData';

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const post = posts.find(p => p.id === id) || posts[0];

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.postCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <View style={styles.postHeader}>
                        <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.userName, { color: colors.text }]}>{post.userName}</Text>
                            <Text style={[styles.handle, { color: colors.textMut }]}>{post.userHandle} · {post.timeAgo}</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/report')}>
                            <Ionicons name="flag-outline" size={18} color={colors.icon} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

                    {post.image && (
                        <Image source={{ uri: post.image }} style={[styles.postImage, { backgroundColor: colors.surfaceAlt }]} resizeMode="cover" />
                    )}

                    {post.tags && post.tags.length > 0 && (
                        <View style={styles.tagsRow}>
                            {post.tags.map(tag => (
                                <Text key={tag} style={[styles.tag, { color: colors.primary }]}>{tag}</Text>
                            ))}
                        </View>
                    )}

                    <View style={[styles.statsRow, { borderTopColor: colors.borderLight }]}>
                        <Text style={[styles.stat, { color: colors.textSec }]}>{post.reactions} Me gusta</Text>
                        <Text style={[styles.stat, { color: colors.textSec }]}>{post.comments} Comentarios</Text>
                    </View>
                </View>

                {/* Comments */}
                <View style={styles.commentsSection}>
                    <Text style={[styles.commentsTitle, { color: colors.text }]}>Comentarios</Text>

                    {[
                        { name: 'Luna Silver', text: '¡Increíble!', time: '2m', seed: 'Luna' },
                        { name: 'River Song', text: 'Me encanta la vibra de este post.', time: '15m', seed: 'River' },
                    ].map((c, i) => (
                        <View key={i} style={styles.commentItem}>
                            <Image
                                source={{ uri: `https://api.dicebear.com/7.x/adventurer-neutral/png?seed=${c.seed}` }}
                                style={styles.commentAvatar}
                            />
                            <View style={[styles.commentBubble, { backgroundColor: colors.surfaceAlt }]}>
                                <View style={styles.commentHeader}>
                                    <Text style={[styles.commentUser, { color: colors.text }]}>{c.name}</Text>
                                    <Text style={[styles.commentTime, { color: colors.textMut }]}>{c.time}</Text>
                                </View>
                                <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.text }]}
                    placeholder="Escribí un comentario..."
                    placeholderTextColor={colors.textMut}
                />
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="send" size={16} color="#FFF" />
                </TouchableOpacity>
            </View>
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
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scrollContent: { paddingBottom: 80 },
    postCard: { padding: 16, borderBottomWidth: 1 },
    postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    avatar: { width: 42, height: 42, borderRadius: 21 },
    userName: { fontSize: 15, fontWeight: '700' },
    handle: { fontSize: 13, marginTop: 1 },
    postContent: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
    postImage: { width: '100%', height: 250, borderRadius: 12, marginBottom: 12 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    tag: { fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, paddingTop: 12 },
    stat: { fontSize: 13, fontWeight: '600' },
    commentsSection: { padding: 16 },
    commentsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
    commentItem: { flexDirection: 'row', marginBottom: 16, gap: 10 },
    commentAvatar: { width: 34, height: 34, borderRadius: 17 },
    commentBubble: { flex: 1, borderRadius: 12, padding: 10 },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    commentUser: { fontSize: 13, fontWeight: '700' },
    commentTime: { fontSize: 12 },
    commentText: { fontSize: 14 },
    inputBar: {
        padding: 12,
        borderTopWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
    },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
    sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});
