import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { userTypes, interestOptions } from '../../data/mockData';

export default function OnboardingScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [step, setStep] = useState(0);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const animateTransition = (nextStep: number) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setStep(nextStep);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    const toggleInterest = (id: string) => {
        setSelectedInterests(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleFinish = () => {
        router.replace('/(tabs)/feed');
    };

    const renderStep = () => {
        if (step === 0) {
            return (
                <View>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>¿Cómo te identificás?</Text>
                    <Text style={[styles.stepSubtitle, { color: colors.textSec }]}>
                        Esto personaliza tu experiencia
                    </Text>
                    <View style={styles.optionsGrid}>
                        {userTypes.map(type => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.typeCard,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    selectedType === type.id && { borderColor: colors.primary, backgroundColor: colors.primaryLight + '15' },
                                ]}
                                onPress={() => setSelectedType(type.id)}
                            >
                                <Text style={styles.typeIcon}>{type.icon}</Text>
                                <Text style={[styles.typeLabel, { color: colors.text }]}>{type.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            );
        }

        if (step === 1) {
            return (
                <View>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>Tus intereses</Text>
                    <Text style={[styles.stepSubtitle, { color: colors.textSec }]}>
                        Seleccioná los que te gusten
                    </Text>
                    <View style={styles.interestsGrid}>
                        {interestOptions.map(interest => (
                            <TouchableOpacity
                                key={interest.id}
                                style={[
                                    styles.interestChip,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    selectedInterests.includes(interest.id) && { borderColor: colors.primary, backgroundColor: colors.primaryLight + '15' },
                                ]}
                                onPress={() => toggleInterest(interest.id)}
                            >
                                <Text style={[
                                    styles.interestText,
                                    { color: selectedInterests.includes(interest.id) ? colors.primary : colors.textSec },
                                ]}>
                                    {interest.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.welcomeContainer}>
                <Ionicons name="paw" size={56} color={colors.primary} />
                <Text style={[styles.welcomeTitle, { color: colors.text }]}>¡Todo listo!</Text>
                <Text style={[styles.welcomeSubtitle, { color: colors.textSec }]}>
                    Tu perfil está configurado. Es hora de explorar tu universo.
                </Text>
            </View>
        );
    };

    const canContinue = step === 0 ? !!selectedType : true;

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Progress */}
            <View style={styles.progressBar}>
                {[0, 1, 2].map(i => (
                    <View
                        key={i}
                        style={[
                            styles.progressSegment,
                            { backgroundColor: i <= step ? colors.primary : colors.border },
                        ]}
                    />
                ))}
            </View>

            {/* Content */}
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {renderStep()}
            </Animated.View>

            {/* Navigation */}
            <View style={[styles.navRow, { borderTopColor: colors.border }]}>
                {step > 0 && (
                    <TouchableOpacity style={styles.backBtn} onPress={() => animateTransition(step - 1)}>
                        <Ionicons name="arrow-back" size={20} color={colors.textSec} />
                        <Text style={[styles.backText, { color: colors.textSec }]}>Atrás</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[
                        styles.nextBtn,
                        { backgroundColor: colors.primary, opacity: canContinue ? 1 : 0.4 },
                        step === 0 && { marginLeft: 'auto' },
                    ]}
                    onPress={() => step < 2 ? animateTransition(step + 1) : handleFinish()}
                    disabled={!canContinue}
                    activeOpacity={0.85}
                >
                    <Text style={styles.nextText}>{step < 2 ? 'Siguiente' : 'Comenzar'}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 56 },
    progressBar: { flexDirection: 'row', paddingHorizontal: 28, gap: 6, marginBottom: 32 },
    progressSegment: { flex: 1, height: 3, borderRadius: 2 },
    content: { flex: 1, paddingHorizontal: 28 },
    stepTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    stepSubtitle: { fontSize: 15, marginTop: 6, marginBottom: 24 },
    optionsGrid: { gap: 12 },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1.5,
        gap: 14,
    },
    typeIcon: { fontSize: 28 },
    typeLabel: { fontSize: 16, fontWeight: '600' },
    interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    interestChip: {
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderWidth: 1.5,
    },
    interestText: { fontSize: 14, fontWeight: '600' },
    welcomeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    welcomeTitle: { fontSize: 32, fontWeight: '800' },
    welcomeSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 280 },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 36,
        borderTopWidth: 1,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
    backText: { fontSize: 15, fontWeight: '600' },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 24,
        gap: 8,
    },
    nextText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
