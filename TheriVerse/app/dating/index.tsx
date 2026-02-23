import { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, Animated,
    Dimensions, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { datingProfiles } from '../../data/mockData';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

export default function DatingScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [ageVerified, setAgeVerified] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [matches, setMatches] = useState<string[]>([]);
    const swipeAnim = useRef(new Animated.Value(0)).current;

    if (!ageVerified) {
        return (
            <View style={[styles.ageGate, { backgroundColor: colors.bg }]}>
                <View style={styles.ageGateContent}>
                    <Ionicons name="lock-closed" size={48} color={colors.textMut} />
                    <Text style={[styles.ageTitle, { color: colors.text }]}>Verificación de Edad</Text>
                    <Text style={[styles.ageSubtitle, { color: colors.textSec }]}>
                        El módulo Dating es exclusivo para mayores de 18 años.
                        Al continuar, confirmás que tenés al menos 18 años.
                    </Text>
                    <TouchableOpacity
                        style={[styles.ageConfirmBtn, { backgroundColor: colors.accent }]}
                        onPress={() => setAgeVerified(true)}
                    >
                        <Text style={styles.ageConfirmText}>Tengo 18+ — Ingresar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ageBackBtn} onPress={() => router.back()}>
                        <Text style={[styles.ageBackText, { color: colors.textSec }]}>Volver</Text>
                    </TouchableOpacity>
                    <View style={styles.disclaimerRow}>
                        <Ionicons name="shield-checkmark" size={16} color={colors.textMut} />
                        <Text style={[styles.disclaimerText, { color: colors.textMut }]}>
                            TheriVerse Dating sigue estrictos estándares de seguridad.
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    const profile = datingProfiles[currentIndex];

    const handleSwipe = (direction: 'left' | 'right' | 'super') => {
        const toValue = direction === 'left' ? -width : width;
        Animated.timing(swipeAnim, {
            toValue: direction === 'super' ? 0 : toValue,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            swipeAnim.setValue(0);
            if (direction === 'right' || direction === 'super') {
                setMatches(prev => [...prev, profile.id]);
                if (Math.random() > 0.5) {
                    Alert.alert('¡Match!', `Vos y ${profile.name} se gustaron.`);
                }
            }
            setCurrentIndex(prev => (prev + 1) % datingProfiles.length);
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.accent }]}>Dating</Text>
                <View style={styles.matchCount}>
                    <Ionicons name="heart" size={16} color={colors.accent} />
                    <Text style={[styles.matchText, { color: colors.accent }]}>{matches.length}</Text>
                </View>
            </View>

            <View style={styles.cardContainer}>
                <Animated.View
                    style={[
                        styles.swipeCard,
                        { backgroundColor: colors.card, transform: [{ translateX: swipeAnim }] },
                    ]}
                >
                    <Image source={{ uri: profile.avatar }} style={[styles.cardImage, { backgroundColor: colors.surfaceAlt }]} />
                    <View style={styles.cardInfo}>
                        <View style={styles.cardNameRow}>
                            <Text style={[styles.cardName, { color: colors.text }]}>{profile.name}</Text>
                            <Text style={[styles.cardAge, { color: colors.textSec }]}>{profile.age}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Ionicons name="paw-outline" size={14} color={colors.primary} />
                            <Text style={[styles.metaText, { color: colors.primary }]}>{profile.species}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={14} color={colors.textMut} />
                            <Text style={[styles.metaText, { color: colors.textMut }]}>{profile.distance}</Text>
                        </View>
                        <Text style={[styles.cardBio, { color: colors.textSec }]}>{profile.bio}</Text>
                        <View style={styles.interestsRow}>
                            {profile.interests.map(i => (
                                <View key={i} style={[styles.interestBadge, { backgroundColor: colors.surfaceAlt }]}>
                                    <Text style={[styles.interestText, { color: colors.textSec }]}>{i}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </Animated.View>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionCircle, { backgroundColor: isDark ? '#3D2222' : '#FFE0E0' }]}
                    onPress={() => handleSwipe('left')}
                >
                    <Ionicons name="close" size={28} color={colors.error} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionCircle, { backgroundColor: isDark ? '#2A2A1A' : '#FFF3CD' }]}
                    onPress={() => handleSwipe('super')}
                >
                    <Ionicons name="star" size={28} color={colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionCircle, { backgroundColor: isDark ? '#1A2A1A' : '#E0FFE0' }]}
                    onPress={() => handleSwipe('right')}
                >
                    <Ionicons name="heart" size={28} color={colors.success} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    ageGate: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    ageGateContent: { alignItems: 'center', maxWidth: 340, gap: 12 },
    ageTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
    ageSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
    ageConfirmBtn: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, marginTop: 12 },
    ageConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    ageBackBtn: { marginTop: 8 },
    ageBackText: { fontSize: 15, fontWeight: '600' },
    disclaimerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
    disclaimerText: { fontSize: 12 },
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
    matchCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    matchText: { fontSize: 16, fontWeight: '700' },
    cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    swipeCard: {
        width: CARD_WIDTH,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    cardImage: { width: '100%', height: CARD_WIDTH * 0.7 },
    cardInfo: { padding: 20, gap: 6 },
    cardNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    cardName: { fontSize: 24, fontWeight: '800' },
    cardAge: { fontSize: 20, fontWeight: '600' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 14, fontWeight: '600' },
    cardBio: { fontSize: 14, lineHeight: 20, marginTop: 4 },
    interestsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 },
    interestBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    interestText: { fontSize: 12, fontWeight: '500' },
    actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingBottom: 36, paddingTop: 8 },
    actionCircle: {
        width: 64, height: 64, borderRadius: 32,
        justifyContent: 'center', alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
});
