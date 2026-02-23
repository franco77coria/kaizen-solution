import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { messages } from '../../data/mockData';

function MessageItem({ msg, colors }: { msg: any; colors: any }) {
    return (
        <TouchableOpacity style={[styles.messageItem, { borderBottomColor: colors.borderLight }]} activeOpacity={0.7}>
            <View style={styles.avatarBox}>
                <Image source={{ uri: msg.userAvatar }} style={styles.avatar} />
                {msg.isOnline && <View style={[styles.onlineDot, { borderColor: colors.bg }]} />}
            </View>
            <View style={styles.messageInfo}>
                <View style={styles.messageTop}>
                    <Text style={[styles.msgName, msg.unread > 0 && styles.msgNameBold, { color: colors.text }]}>
                        {msg.userName}
                    </Text>
                    <Text style={[styles.msgTime, { color: colors.textMut }]}>{msg.timeAgo}</Text>
                </View>
                <Text
                    style={[styles.msgPreview, msg.unread > 0 && styles.msgPreviewBold, { color: msg.unread > 0 ? colors.text : colors.textMut }]}
                    numberOfLines={1}
                >
                    {msg.lastMessage}
                </Text>
            </View>
            {msg.unread > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unreadText}>{msg.unread}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

export default function InboxScreen() {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Mensajes</Text>
                <TouchableOpacity style={styles.reqBtn}>
                    <Text style={[styles.reqText, { color: colors.primary }]}>Solicitudes</Text>
                    <View style={[styles.reqBadge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.reqBadgeText}>2</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Online now */}
            <View style={[styles.onlineSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.onlineTitle, { color: colors.textSec }]}>En línea</Text>
                <FlatList
                    data={messages.filter(m => m.isOnline)}
                    horizontal
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.onlineItem}>
                            <View style={styles.onlineAvatarBox}>
                                <Image source={{ uri: item.userAvatar }} style={styles.onlineAvatar} />
                                <View style={[styles.onlineDotSmall, { borderColor: colors.surface }]} />
                            </View>
                            <Text style={[styles.onlineName, { color: colors.textSec }]} numberOfLines={1}>
                                {item.userName.split(' ')[0]}
                            </Text>
                        </TouchableOpacity>
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.onlineScroll}
                />
            </View>

            {/* Messages */}
            <FlatList
                data={messages}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <MessageItem msg={item} colors={colors} />}
                contentContainerStyle={styles.msgList}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <Text style={[styles.listTitle, { color: colors.text }]}>Conversaciones</Text>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={48} color={colors.textMut} />
                        <Text style={[styles.emptyText, { color: colors.textMut }]}>Sin mensajes aún</Text>
                    </View>
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
    headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    reqBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reqText: { fontSize: 14, fontWeight: '600' },
    reqBadge: { borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    reqBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
    onlineSection: { paddingVertical: 12, borderBottomWidth: 1 },
    onlineTitle: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 8 },
    onlineScroll: { paddingHorizontal: 16, gap: 16 },
    onlineItem: { alignItems: 'center', width: 56 },
    onlineAvatarBox: { position: 'relative' },
    onlineAvatar: { width: 48, height: 48, borderRadius: 24 },
    onlineDotSmall: {
        position: 'absolute', bottom: 0, right: 0,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: '#00C853',
        borderWidth: 2,
    },
    onlineName: { fontSize: 11, marginTop: 4, fontWeight: '500' },
    msgList: { paddingHorizontal: 16, paddingBottom: 16 },
    listTitle: { fontSize: 15, fontWeight: '700', marginTop: 16, marginBottom: 8 },
    messageItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
    avatarBox: { position: 'relative' },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    onlineDot: {
        position: 'absolute', bottom: 1, right: 1,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: '#00C853',
        borderWidth: 2,
    },
    messageInfo: { flex: 1 },
    messageTop: { flexDirection: 'row', justifyContent: 'space-between' },
    msgName: { fontSize: 15, fontWeight: '600' },
    msgNameBold: { fontWeight: '800' },
    msgTime: { fontSize: 12 },
    msgPreview: { fontSize: 14, marginTop: 2 },
    msgPreviewBold: { fontWeight: '600' },
    unreadBadge: { borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    unreadText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
    emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15 },
});
