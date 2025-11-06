import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: "#fff",
            headerStyle: { backgroundColor: "#083474" },
            headerTintColor: "#fff",
            tabBarStyle: {
                backgroundColor: '#083474'
            },
            tabBarInactiveTintColor: '#fff',
        }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => <Entypo name="home" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="vaccins"
                href="/(protected)/(tabs)/agendamentos"
                options={{
                    title: 'Agendar',
                    tabBarLabel: 'Agendar',
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
                }}
            />
            <Tabs.Screen
                name="ubs"
                options={{
                    tabBarLabel: 'UBS',
                    headerTitle: 'Unidades Básicas de Saúde (UBSs)',
                    tabBarIcon: ({ color, size }) => <FontAwesome6 name="hospital" size={size} color={color} />
                }}
            />
            <Tabs.Screen
                name="vaccincard"
                options={{
                    tabBarLabel: 'Histórico',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <Octicons name="checklist" size={size} color={color} />
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Perfil",
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: "index",
                    href: null,
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <Octicons name="question" size={size} color={color} />
                }}
            />
        </Tabs>
    );
}