import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { posts, users } from '../../data/mockData';

function PostCard({ post, colors, router }: { post: any; colors: any; router: any }) {
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const reactions = post.reactions + (liked ? 1 : 0);
    const user = users.find((u: any) => u.id === post.userId);

    return (
        <TouchableOpacity
            style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/post/${post.id}`)}
            activeOpacity={0.9}
        >
            {/* Header */}
            <View style={styles.postHeader}>
                <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
                <View style={styles.postUserInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.userName, { color: colors.text }]}>{post.userName}</Text>
                        {user?.isVerified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
                    </View>
                    <Text style={[styles.handle, { color: colors.textMut }]}>{post.userHandle} · {post.timeAgo}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/report')}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.icon} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

            {post.image && (
                <Image source={{ uri: post.image }} style={[styles.postImage, { backgroundColor: colors.surfaceAlt }]} resizeMode="cover" />
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
                <View style={styles.tagsRow}>
                    {post.tags.map((tag: string) => (
                        <Text key={tag} style={[styles.tag, { color: colors.primary }]}>{tag}</Text>
                    ))}
                </View>
            )}

            {/* Actions */}
            <View style={[styles.actionsRow, { borderTopColor: colors.borderLight }]}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setLiked(!liked)}>
                    <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.error : colors.icon} />
                    <Text style={[styles.actionCount, { color: liked ? colors.error : colors.textMut }]}>{reactions}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={19} color={colors.icon} />
                    <Text style={[styles.actionCount, { color: colors.textMut }]}>{post.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="share-social-outline" size={20} color={colors.icon} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { marginLeft: 'auto' }]} onPress={() => setSaved(!saved)}>
                    <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? colors.primary : colors.icon} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

export default function FeedScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1200);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                    <Ionicons name="paw" size={24} color={colors.primary} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>TheriVerse</Text>
                </View>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={22} color={colors.icon} />
                </TouchableOpacity>
            </View>

            {/* Stories */}
            <View style={[styles.storiesBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <FlatList
                    data={users.slice(0, 6)}
                    horizontal
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.storyItem}>
                            <View style={[styles.storyRing, { borderColor: colors.primary }]}>
                                <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
                            </View>
                            <Text style={[styles.storyName, { color: colors.textSec }]} numberOfLines={1}>
                                {item.name.split(' ')[0]}
                            </Text>
                        </TouchableOpacity>
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storiesScroll}
                />
            </View>

            {/* Feed */}
            <FlatList
                data={posts}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <PostCard post={item} colors={colors} router={router} />}
                contentContainerStyle={styles.feedList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            />
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
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    storiesBar: { paddingVertical: 12, borderBottomWidth: 1 },
    storiesScroll: { paddingHorizontal: 16, gap: 16 },
    storyItem: { alignItems: 'center', width: 60 },
    storyRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, padding: 2 },
    storyAvatar: { width: '100%', height: '100%', borderRadius: 24 },
    storyName: { fontSize: 11, marginTop: 4, fontWeight: '500' },
    feedList: { padding: 16, paddingBottom: 8 },
    postCard: { borderRadius: 16, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
    postHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    postUserInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    userName: { fontSize: 14, fontWeight: '700' },
    handle: { fontSize: 12, marginTop: 1 },
    postContent: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 },
    postImage: { width: '100%', height: 220 },
    tagsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, flexWrap: 'wrap' },
    tag: { fontSize: 13, fontWeight: '600' },
    actionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, gap: 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionCount: { fontSize: 13, fontWeight: '600' },
});
