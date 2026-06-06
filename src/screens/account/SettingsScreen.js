import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccountSubScreen, { accountStyles } from './AccountSubScreen';
import { useApp } from '../../context/AppContext';

const INDIGO = '#4F6BED';
const TTS_ENGINES = [
  { key: 'native', label: 'Voix native', subtitle: 'Instantané' },
  { key: 'edge', label: 'Edge TTS', subtitle: 'Microsoft en ligne' },
  { key: 'kokoro', label: 'Kokoro', subtitle: 'Local, bonne qualité' },
  { key: 'piper', label: 'Piper', subtitle: 'Local, ultra-rapide' },
  { key: 'xtts', label: 'XTTS v2', subtitle: 'Local, premium' },
  { key: 'elevenlabs', label: 'ElevenLabs', subtitle: 'Cloud, très naturel' },
];

export default function SettingsScreen({ navigation }) {
  const { avatarConfig, setAvatarConfig } = useApp();

  const toggleConversation = (v) => setAvatarConfig({ ...avatarConfig, conversationMode: v });
  const toggleOllama       = (v) => setAvatarConfig({ ...avatarConfig, useOllama: v });
  const selectTtsEngine    = (engine) => setAvatarConfig({ ...avatarConfig, ttsEngine: engine });

  return (
    <AccountSubScreen navigation={navigation} title="Settings">
      <Text style={accountStyles.sectionLabel}>Avatar</Text>
      <View style={accountStyles.card}>
        <Row
          icon="chatbubbles-outline"
          title="Mode conversation naturelle"
          subtitle="Reponses simples et empathiques"
          value={avatarConfig?.conversationMode ?? true}
          onChange={toggleConversation}
        />
      </View>

      <Text style={accountStyles.sectionLabel}>IA</Text>
      <View style={accountStyles.card}>
        <Row
          icon="sparkles-outline"
          title="Utiliser Ollama local"
          subtitle="Reponse IA locale sur votre Mac"
          value={avatarConfig?.useOllama ?? true}
          onChange={toggleOllama}
        />
      </View>

      <Text style={accountStyles.sectionLabel}>Voix de l'avatar</Text>
      <View style={accountStyles.card}>
        <Text style={localStyles.helperText}>Choisissez le moteur vocal utilisé par l'avatar.</Text>
        <View style={localStyles.engineGrid}>
          {TTS_ENGINES.map((engine) => {
            const selected = (avatarConfig?.ttsEngine ?? 'native') === engine.key;
            return (
              <TouchableOpacity
                key={engine.key}
                style={[localStyles.engineChip, selected && localStyles.engineChipActive]}
                onPress={() => selectTtsEngine(engine.key)}
              >
                <Text style={[localStyles.engineTitle, selected && localStyles.engineTitleActive]}>{engine.label}</Text>
                <Text style={[localStyles.engineSubtitle, selected && localStyles.engineSubtitleActive]}>{engine.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={accountStyles.sectionLabel}>Application</Text>
      <View style={accountStyles.card}>
        <Row
          icon="moon-outline"
          title="Mode sombre"
          subtitle="A venir dans une prochaine version"
          value={false}
          onChange={() => {}}
          disabled
        />
        <View style={localStyles.divider} />
        <Row
          icon="language-outline"
          title="Langue"
          subtitle="Francais"
          value={true}
          onChange={() => {}}
          disabled
        />
      </View>
    </AccountSubScreen>
  );
}

function Row({ icon, title, subtitle, value, onChange, disabled }) {
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
        disabled={disabled}
        trackColor={{ false: '#D1D5DB', true: INDIGO + '60' }}
        thumbColor={value ? INDIGO : '#FFFFFF'}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  helperText: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  engineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  engineChip: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E5ECFF',
  },
  engineChipActive: {
    backgroundColor: '#EEF3FF',
    borderColor: INDIGO,
  },
  engineTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  engineTitleActive: { color: INDIGO },
  engineSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  engineSubtitleActive: { color: INDIGO },
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
