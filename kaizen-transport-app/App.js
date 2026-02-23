import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { useState } from 'react';

export default function App() {
    const [role, setRole] = useState(null);

    const MainContent = () => (
        <View style={styles.innerContainer}>
            {role ? (
                <View style={styles.roleContainer}>
                    <Text style={styles.roleTitle}>Modo: {role}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => setRole(null)}>
                        <Text style={styles.backButtonText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.menuContainer}>
                    <Text style={styles.title}>Kaizen Transport</Text>
                    <Text style={styles.subtitle}>Selecciona tu perfil:</Text>

                    <TouchableOpacity style={[styles.button, { backgroundColor: '#2c3e50' }]} onPress={() => setRole('ADMIN')}>
                        <Text style={styles.buttonText}>Administrador</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, { backgroundColor: '#27ae60' }]} onPress={() => setRole('CHOFER')}>
                        <Text style={styles.buttonText}>Chofer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, { backgroundColor: '#2980b9' }]} onPress={() => setRole('USUARIO')}>
                        <Text style={styles.buttonText}>Paciente / Usuario</Text>
                    </TouchableOpacity>
                </View>
            )}
            <StatusBar style="auto" />
        </View>
    );

    // Si estamos en WEB, usamos un contenedor para simular el celular
    if (Platform.OS === 'web') {
        return (
            <View style={styles.webWindow}>
                <View style={styles.mobileFrame}>
                    <MainContent />
                </View>
            </View>
        );
    }

    // En celular real, se ve normal
    return (
        <View style={styles.container}>
            <MainContent />
        </View>
    );
}

const styles = StyleSheet.create({
    // Estilos para simular el celular en Web
    webWindow: {
        flex: 1,
        backgroundColor: '#e0e0e0', // Fondo gris de escritorio
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
    },
    mobileFrame: {
        width: 375, // Ancho típico de iPhoneSE/Android
        height: 812, // Alto típico
        backgroundColor: '#f5f6fa',
        borderRadius: 30, // Bordes curvos del celular
        borderWidth: 8,
        borderColor: '#333', // Marco del celular
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },

    // Estilos internos de la App
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    innerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f6fa',
        width: '100%',
    },
    menuContainer: {
        width: '100%',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 30,
        color: '#666',
    },
    button: {
        width: '100%',
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    roleContainer: {
        alignItems: 'center',
        width: '100%',
    },
    roleTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: '#e74c3c',
        fontSize: 16,
    }
});
