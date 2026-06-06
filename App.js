import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useApp } from './src/context/AppContext';
import { COLORS } from './src/theme';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { initNotifications, MEDICATION_PRECALL_TYPE, syncMedicationPrecallNotifications } from './src/services/notificationService';

import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MoodTrackingScreen from './src/screens/MoodTrackingScreen';
import MealScanScreen from './src/screens/MealScanScreen';
import MedicationsScreen from './src/screens/MedicationsScreen';
import MedicationCallScreen from './src/screens/MedicationCallScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import AvatarProfileScreen from './src/screens/AvatarProfileScreen';
import GlucoseScreen from './src/screens/GlucoseScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import GlucoseMesureScreen from './src/screens/GlucoseMesureScreen';
import GlucoseHistoriqueScreen from './src/screens/GlucoseHistoriqueScreen';
import GlucoseBilanScreen from './src/screens/GlucoseBilanScreen';
import GlucoseMedecinScreen from './src/screens/GlucoseMedecinScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import AccountInfoScreen from './src/screens/account/AccountInfoScreen';
import TreatmentsScreen from './src/screens/account/TreatmentsScreen';
import PaymentMethodsScreen from './src/screens/account/PaymentMethodsScreen';
import DoctorContactsScreen from './src/screens/account/DoctorContactsScreen';
import SettingsScreen from './src/screens/account/SettingsScreen';
import NotificationsSettingsScreen from './src/screens/account/NotificationsSettingsScreen';
import SecurityScreen from './src/screens/account/SecurityScreen';
import SupportScreen from './src/screens/account/SupportScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcons = {
  AssistantTab: { focused: 'sparkles',      unfocused: 'sparkles-outline' },
  TrackingTab:  { focused: 'stats-chart',   unfocused: 'stats-chart-outline' },
  ProfileTab:   { focused: 'person-circle', unfocused: 'person-circle-outline' },
};

const tabLabels = {
  AssistantTab: 'Avatar',
  TrackingTab:  'Suivi',
  ProfileTab:   'Profil',
};

// Each tab has its own accent — matches the screen it shows
const tabAccents = {
  AssistantTab: { primary: '#1B9AAA', soft: '#D6F1EF' }, // teal (Avatar)
  TrackingTab:  { primary: '#FF6B35', soft: '#FFE6D8' }, // orange (Suivi)
  ProfileTab:   { primary: '#4F6BED', soft: '#E8EEFE' }, // indigo (Profil)
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const accent = tabAccents[route.name];
        return {
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            const icons = tabIcons[route.name];
            const iconName = focused ? icons.focused : icons.unfocused;
            return (
              <View
                style={{
                  width: 44, height: 32, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: focused ? accent.soft : 'transparent',
                }}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={focused ? accent.primary : '#9094A0'}
                />
              </View>
            );
          },
          tabBarActiveTintColor: accent.primary,
          tabBarInactiveTintColor: '#9094A0',
          tabBarLabel: tabLabels[route.name],
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 72,
          paddingTop: 6,
          paddingBottom: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        };
      }}
    >
      <Tab.Screen name="AssistantTab" component={DashboardScreen} />
      <Tab.Screen name="TrackingTab"  component={TrackingScreen} />
      <Tab.Screen name="ProfileTab"   component={UserProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { onboardingComplete, medications } = useApp();
  const navigationRef = useRef(null);
  const lastHandledNotificationIdRef = useRef(null);

  useEffect(() => {
    initNotifications();
  }, []);

  useEffect(() => {
    if (!onboardingComplete) return;
    syncMedicationPrecallNotifications(medications || []);
  }, [medications, onboardingComplete]);

  useEffect(() => {
    const handleResponse = (response) => {
      const notificationId = response?.notification?.request?.identifier;
      if (!notificationId || lastHandledNotificationIdRef.current === notificationId) return;
      lastHandledNotificationIdRef.current = notificationId;

      const data = response?.notification?.request?.content?.data || {};
      const actionId = response?.actionIdentifier;
      if (data.type !== MEDICATION_PRECALL_TYPE) return;
      if (actionId === 'dismiss') return;

      navigationRef.current?.navigate('MedicationCall', {
        medicationName: data.medicationName || 'Votre traitement',
        scheduledTime: data.scheduledTime || 'maintenant',
        source: 'notification',
      });
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) handleResponse(r);
    });

    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!onboardingComplete ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={HomeTabs} />
              <Stack.Screen name="MealScan" component={MealScanScreen} />
              <Stack.Screen name="Family" component={FamilyScreen} />
              <Stack.Screen name="Medications" component={MedicationsScreen} />
              <Stack.Screen name="MedicationCall" component={MedicationCallScreen} />
              <Stack.Screen name="Glucose" component={GlucoseScreen} />
              <Stack.Screen name="GlucoseMesure" component={GlucoseMesureScreen} />
              <Stack.Screen name="GlucoseHistorique" component={GlucoseHistoriqueScreen} />
              <Stack.Screen name="GlucoseBilan" component={GlucoseBilanScreen} />
              <Stack.Screen name="GlucoseMedecin" component={GlucoseMedecinScreen} />
              <Stack.Screen name="AvatarProfile" component={AvatarProfileScreen} />
              <Stack.Screen name="Analysis" component={AnalysisScreen} />
              <Stack.Screen name="MoodTracking" component={MoodTrackingScreen} />
              <Stack.Screen name="AccountInfo" component={AccountInfoScreen} />
              <Stack.Screen name="Treatments" component={TreatmentsScreen} />
              <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
              <Stack.Screen name="DoctorContacts" component={DoctorContactsScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} />
              <Stack.Screen name="Security" component={SecurityScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}
