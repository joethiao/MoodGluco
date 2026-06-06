import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccountSubScreen, { accountStyles } from './AccountSubScreen';
import { useApp } from '../../context/AppContext';

const INDIGO = '#4F6BED';

export default function NotificationsSettingsScreen({ navigation }) {
  const { avatarConfig, setAvatarConfig } = useApp();
  const [glucoseAlerts, setGlucoseAlerts]     = useState(true);
  const [moodReminders, setMoodReminders]     = useState(true);
  const [emailUpdates, setEmailUpdates]       = useState(false);

  return (
    <AccountSubScreen navigation={navigation} title="Notifications">
      <Text style={accountStyles.sectionLabel}>Alertes santé</Text>
      <View style={accountStyles.card}>
        <Row
          icon="medkit-outline"
          title="Rappel medicaments"
          subtitle="Notification a chaque prise prevue"
          value={true}
          onChange={() => {}}
        />
        <Divider />
        <Row
          icon="pulse-outline"
          title="Alertes glycemie"
          subtitle="Si valeur hors de la zone cible"
          value={glucoseAlerts}
          onChange={setGlucoseAlerts}
        />
        <Divider />
        <Row
          icon="people-outline"
          title="Alerte famille si oubli"
          subtitle="Notifie un proche apres un oubli"
          value={avatarConfig?.notifyFamilyOnMissedMed ?? true}
          onChange={(v) => setAvatarConfig({ ...avatarConfig, notifyFamilyOnMissedMed: v })}
        />
      </View>

      <Text style={accountStyles.sectionLabel}>Bien-etre</Text>
      <View style={accountStyles.card}>
        <Row
          icon="happy-outline"
          title="Rappels d'humeur"
          subtitle="Verifications quotidiennes"
          value={moodReminders}
          onChange={setMoodReminders}
        />
      </View>

      <Text style={accountStyles.sectionLabel}>Email</Text>
      <View style={accountStyles.card}>
        <Row
          icon="mail-outline"
          title="Resume hebdomadaire"
          subtitle="Recevez un bilan chaque semaine"
          value={emailUpdates}
          onChange={setEmailUpdates}
        />
      </View>
    </AccountSubScreen>
  );
}

function Row({ icon, title, subtitle, value, onChange }) {
  return (
    <View style={localStyles.row}>
      <View style={localStyles.iconBox}>
        <Ionicons name={icon} size={18} color="#4F6BED" />
      </View>
      <View style={localStyles.text}>
        <Text style={localStyles.title}>{title}</Text>
        <Text style={localStyles.subtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#D1D5DB', true: INDIGO + '60' }}
        thumbColor={value ? INDIGO : '#FFFFFF'}
      />
    </View>
  );
}

function Divider() {
  return <View style={localStyles.divider} />;
}

const localStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8EEFE',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 4 },
});
