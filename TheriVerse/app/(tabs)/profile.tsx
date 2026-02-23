import { useState } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { currentUser, posts } from '../../data/mockData';

export default function ProfileScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<'posts' | 'fursona' | 'therian'>('posts');

    const tabs = [
        { key: 'posts' as const, label: 'Posts', icon: 'grid-outline' as const },
        { key: 'fursona' as const, label: 'Fursona', icon: 'color-palette-outline' as const },
        { key: 'therian' as const, label: 'Therian', icon: 'paw-outline' as const },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Perfil</Text>
                <TouchableOpacity onPress={() => router.push('/settings' as any)}>
                    <Ionicons name="settings-outline" size={22} color={colors.icon} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.avatarRow}>
                        <Image source={{ uri: currentUser.avatar }} style={[styles.avatar, { borderColor: colors.primary }]} />
                        {currentUser.isVerified && (
                            <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                                <Ionicons name="checkmark" size={12} color="#FFF" />
                            </View>
                        )}
                    </View>
                    <Text style={[styles.name, { color: colors.text }]}>{currentUser.name}</Text>
                    <Text style={[styles.handle, { color: colors.textMut }]}>{currentUser.handle}</Text>
                    {currentUser.pronouns && (
                        <Text style={[styles.pronouns, { color: colors.primary }]}>{currentUser.pronouns}</Text>
                    )}
                    <Text style={[styles.bio, { color: colors.textSec }]}>{currentUser.bio}</Text>

                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textMut} />
                        <Text style={[styles.location, { color: colors.textMut }]}>{currentUser.location}</Text>
                    </View>

                    {/* Stats */}
                    <View style={[styles.statsRow, { borderTopColor: colors.borderLight }]}>
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: colors.text }]}>{currentUser.posts}</Text>
                            <Text style={[styles.statLabel, { color: colors.textMut }]}>Posts</Text>
                        </View>
                        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: colors.text }]}>{currentUser.followers}</Text>
                            <Text style={[styles.statLabel, { color: colors.textMut }]}>Seguidores</Text>
                        </View>
                        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: colors.text }]}>{currentUser.following}</Text>
                            <Text style={[styles.statLabel, { color: colors.textMut }]}>Siguiendo</Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primary }]}>
                            <Text style={styles.editBtnText}>Editar Perfil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                            <Ionicons name="share-outline" size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Identity tabs */}
                <View style={[styles.tabsContainer, { backgroundColor: colors.surfaceAlt }]}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.card }]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={18}
                                color={activeTab === tab.key ? colors.primary : colors.textMut}
                            />
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === tab.key ? colors.primary : colors.textMut },
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab content */}
                {activeTab === 'posts' && (
                    <View style={styles.postsGrid}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <TouchableOpacity key={i} style={styles.gridItem}>
                                <Image
                                    source={{ uri: `https://picsum.photos/seed/post${i}/300/300` }}
                                    style={[styles.gridImage, { backgroundColor: colors.surfaceAlt }]}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {activeTab === 'fursona' && currentUser.fursona && (
                    <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.idHeader}>
                            <Ionicons name="color-palette" size={24} color={colors.primary} />
                            <Text style={[styles.idTitle, { color: colors.text }]}>Identidad Fursona</Text>
                        </View>
                        {[
                            ['Especie', currentUser.fursona.species],
                            ['Paleta de Color', currentUser.fursona.palette],
                            ['Estilo Artístico', currentUser.fursona.style],
                        ].map(([label, value]) => (
                            <View key={label} style={styles.idField}>
                                <Text style={[styles.fieldLabel, { color: colors.textMut }]}>{label}</Text>
                                <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
                            </View>
                        ))}
                        <Text style={[styles.galleryLabel, { color: colors.text }]}>Refs & Arte</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                            {[1, 2, 3].map(i => (
                                <Image key={i} source={{ uri: `https://picsum.photos/seed/ref${i}/200/260` }} style={[styles.galleryImg, { backgroundColor: colors.surfaceAlt }]} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {activeTab === 'therian' && currentUser.therian && (
                    <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.idHeader}>
                            <Ionicons name="paw" size={24} color={colors.primary} />
                            <Text style={[styles.idTitle, { color: colors.text }]}>Identidad Therian</Text>
                        </View>
                        <View style={styles.idField}>
                            <Text style={[styles.fieldLabel, { color: colors.textMut }]}>Theriotipos</Text>
                            <View style={styles.badgesRow}>
                                {currentUser.therian.theriotypes.map(t => (
                                    <View key={t} style={[styles.badge, { backgroundColor: colors.primaryLight + '15' }]}>
                                        <Text style={[styles.badgeText, { color: colors.primary }]}>{t}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                        {currentUser.therian.shiftTags && (
                            <View style={styles.idField}>
                                <Text style={[styles.fieldLabel, { color: colors.textMut }]}>Tipos de Shift</Text>
                                <View style={styles.badgesRow}>
                                    {currentUser.therian.shiftTags.map(s => (
                                        <View key={s} style={[styles.shiftBadge, { backgroundColor: colors.surfaceAlt }]}>
                                            <Text style={[styles.shiftText, { color: colors.textSec }]}>{s}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                        <TouchableOpacity style={[styles.journalBtn, { backgroundColor: colors.surfaceAlt }]}>
                            <Ionicons name="book-outline" size={20} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.journalTitle, { color: colors.text }]}>Diario de Shifts</Text>
                                <Text style={[styles.journalDesc, { color: colors.textMut }]}>3 entradas esta semana</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMut} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Quick links */}
                <TouchableOpacity
                    style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.border }]}
                    activeOpacity={0.8}
                >
                    <Ionicons name="shield-checkmark-outline" size={22} color={colors.icon} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.qlTitle, { color: colors.text }]}>Consentimiento y Límites</Text>
                        <Text style={[styles.qlDesc, { color: colors.textMut }]}>Configurá tus preferencias de interacción</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMut} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.accent }]}
                    onPress={() => router.push('/dating' as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="heart" size={22} color={colors.accent} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.qlTitle, { color: colors.accent }]}>Dating Premium</Text>
                        <Text style={[styles.qlDesc, { color: colors.textMut }]}>Encontrá tu match en la manada</Text>
                    </View>
                    <View style={[styles.ageBadge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.ageText}>18+</Text>
                    </View>
                </TouchableOpacity>
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
    headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    scrollContent: { paddingBottom: 24 },
    profileCard: {
        margin: 16,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
    },
    avatarRow: { position: 'relative' },
    avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3 },
    verifiedBadge: {
        position: 'absolute', bottom: 0, right: -2,
        width: 22, height: 22, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center',
    },
    name: { fontSize: 22, fontWeight: '800', marginTop: 14 },
    handle: { fontSize: 14, marginTop: 2 },
    pronouns: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    bio: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    location: { fontSize: 13 },
    statsRow: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, width: '100%' },
    stat: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 12, marginTop: 2 },
    statDiv: { width: 1, height: 28 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
    editBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    editBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    shareBtn: {
        width: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1,
    },
    tabsContainer: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, padding: 4, gap: 4 },
    tab: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
    tabText: { fontSize: 13, fontWeight: '600' },
    postsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 4 },
    gridItem: { width: '32.5%', aspectRatio: 1 },
    gridImage: { width: '100%', height: '100%', borderRadius: 10 },
    identityCard: { margin: 16, borderRadius: 18, padding: 20, borderWidth: 1 },
    idHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    idTitle: { fontSize: 18, fontWeight: '700' },
    idField: { marginBottom: 16 },
    fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    fieldValue: { fontSize: 16, fontWeight: '600' },
    badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    badge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    badgeText: { fontSize: 14, fontWeight: '600' },
    shiftBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
    shiftText: { fontSize: 12, fontWeight: '500' },
    galleryLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
    galleryScroll: { gap: 10 },
    galleryImg: { width: 140, height: 180, borderRadius: 12 },
    journalBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12, marginTop: 4 },
    journalTitle: { fontSize: 14, fontWeight: '700' },
    journalDesc: { fontSize: 12 },
    quickLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
    },
    qlTitle: { fontSize: 15, fontWeight: '700' },
    qlDesc: { fontSize: 12, marginTop: 2 },
    ageBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    ageText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
});
