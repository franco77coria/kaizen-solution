import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type IconName = 'home' | 'compass' | 'add-circle' | 'chatbubbles' | 'person';

function TabIcon({ icon, focused, label, colors }: { icon: IconName; focused: boolean; label: string; colors: any }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? icon : (`${icon}-outline` as any)}
        size={24}
        color={focused ? colors.tabActive : colors.tabDefault}
      />
      <Text style={[styles.tabLabel, { color: focused ? colors.tabActive : colors.tabDefault }]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="home" label="Inicio" focused={focused} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="compass" label="Explorar" focused={focused} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="add-circle" label="Crear" focused={focused} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="chatbubbles" label="Mensajes" focused={focused} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="person" label="Perfil" focused={focused} colors={colors} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
});
