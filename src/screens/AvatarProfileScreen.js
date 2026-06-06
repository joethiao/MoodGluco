import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Switch, TextInput, StatusBar, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';
import AnimatedAvatarImage from '../components/AnimatedAvatarImage';

const DETAIL_LEVELS = [
  { key: 'low', label: 'Essentiel' },
  { key: 'medium', label: 'Equilibre' },
  { key: 'high', label: 'Detaille' },
];
const REMINDER_FREQ = [
  { key: 'low', label: 'Discret' },
  { key: 'medium', label: 'Normal' },
  { key: 'high', label: 'Frequent' },
];
const AVATAR_GENDERS = [
  { key: 'female', label: 'Féminin' },
  { key: 'male', label: 'Masculin' },
];
const TTS_ENGINES = [
  {
    key:     'native',
    label:   'Voix native',
    speed:   '⚡⚡⚡ Instantané',
    quality: '★★★ Bonne',
    info:    'Voix intégrée iOS/Android',
    server:  null,
  },
  {
    key:     'edge',
    label:   'Edge TTS',
    speed:   '⚡⚡ ~300ms',
    quality: '★★★★★ Excellente',
    info:    'Voix Microsoft · Gratuit · Internet',
    server:  'npm run tts:edge',
  },
  {
    key:     'kokoro',
    label:   'Kokoro',
    speed:   '⚡⚡ ~200ms',
    quality: '★★★★ Très bonne',
    info:    'Local · Offline · 280MB',
    server:  'npm run tts:kokoro',
  },
  {
    key:     'piper',
    label:   'Piper',
    speed:   '⚡⚡⚡ ~80ms',
    quality: '★★★ Bonne',
    info:    'Local · Offline · Ultra-rapide',
    server:  'npm run tts:piper',
  },
  {
    key:     'xtts',
    label:   'XTTS v2',
    speed:   '⚡ ~2-3s',
    quality: '★★★★★ Premium',
    info:    'Local · Offline · Voix réalistes',
    server:  'npm run tts:xtts',
  },
  {
    key:     'elevenlabs',
    label:   'ElevenLabs',
    speed:   '⚡⚡ ~300-800ms',
    quality: '★★★★★ Studio',
    info:    'Cloud · Internet · Voix ultra naturelles',
    server:  null,
  },
];

const AvatarProfileScreen = ({ navigation }) => {
  const { avatarConfig, setAvatarConfig, userProfile, loadDemoData } = useApp();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const statusBarStyle = isDarkMode ? 'light-content' : 'dark-content';
  const statusBarBackground = isDarkMode ? COLORS.dark : COLORS.white;

  const update = (key, value) => {
    setAvatarConfig({ ...avatarConfig, [key]: value });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: statusBarBackground }]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBackground} translucent={false} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: COLORS.dark }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paramètres Avatar</Text>
          <Text style={styles.headerSub}>Voix, langue et préférences</Text>
        </View>

        <View style={styles.body}>
          {/* Live preview */}
          <View style={styles.previewCard}>
            <AnimatedAvatarImage speaking={false} size={120} />
          </View>

          {/* Avatar gender selection */}
          <Text style={styles.sectionTitle}>Profil de l'avatar</Text>
          <View style={styles.optionRow}>
            {AVATAR_GENDERS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.optionChip, avatarConfig.gender === g.key && styles.optionChipActive]}
                onPress={() => update('gender', g.key)}
              >
                <Text style={[styles.optionChipText, avatarConfig.gender === g.key && styles.optionChipTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Mode conversation naturelle</Text>
              <Text style={styles.switchHint}>Parlez comme a une personne, reponses simples et empathiques.</Text>
            </View>
            <Switch
              value={avatarConfig.conversationMode}
              onValueChange={(v) => update('conversationMode', v)}
              trackColor={{ false: COLORS.muted, true: COLORS.primary + '60' }}
              thumbColor={avatarConfig.conversationMode ? COLORS.primary : '#ccc'}
            />
          </View>

          <View style={styles.switchCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Alerte a un proche si oubli</Text>
              <Text style={styles.switchHint}>Option recommandee pour un suivi securisant.</Text>
            </View>
            <Switch
              value={avatarConfig.notifyFamilyOnMissedMed}
              onValueChange={(v) => update('notifyFamilyOnMissedMed', v)}
              trackColor={{ false: COLORS.muted, true: COLORS.primary + '60' }}
              thumbColor={avatarConfig.notifyFamilyOnMissedMed ? COLORS.primary : '#ccc'}
            />
          </View>

          <View style={styles.switchCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Utiliser Ollama local</Text>
              <Text style={styles.switchHint}>Active une reponse IA locale pour l'avatar.</Text>
            </View>
            <Switch
              value={avatarConfig.useOllama}
              onValueChange={(v) => update('useOllama', v)}
              trackColor={{ false: COLORS.muted, true: COLORS.primary + '60' }}
              thumbColor={avatarConfig.useOllama ? COLORS.primary : '#ccc'}
            />
          </View>



          {/* TTS engine */}
          <Text style={styles.sectionTitle}>Moteur de voix</Text>
          {TTS_ENGINES.map((e) => {
            const active = (avatarConfig.ttsEngine ?? 'native') === e.key;
            return (
              <TouchableOpacity
                key={e.key}
                style={[styles.engineCard, active && styles.engineCardActive]}
                onPress={() => update('ttsEngine', e.key)}
                activeOpacity={0.75}
              >
                <View style={styles.engineCardLeft}>
                  <View style={styles.engineCardTitleRow}>
                    <Text style={[styles.engineCardTitle, active && styles.engineCardTitleActive]}>
                      {e.label}
                    </Text>
                    {active && (
                      <View style={styles.engineBadgeActive}>
                        <Text style={styles.engineBadgeText}>Actif</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.engineCardInfo, active && styles.engineCardInfoActive]}>
                    {e.info}
                  </Text>
                  <View style={styles.engineCardStats}>
                    <Text style={[styles.engineStat, active && styles.engineStatActive]}>{e.speed}</Text>
                    <Text style={[styles.engineStatDot, active && styles.engineStatActive]}> · </Text>
                    <Text style={[styles.engineStat, active && styles.engineStatActive]}>{e.quality}</Text>
                  </View>
                  {active && e.server && (
                    <Text style={styles.engineServerHint}>Lancer : {e.server}</Text>
                  )}
                </View>
                <View style={[styles.engineRadio, active && styles.engineRadioActive]}>
                  {active && <View style={styles.engineRadioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={styles.sectionTitle}>Connexion Ollama</Text>
          <TextInput
            style={styles.input}
            placeholder="Endpoint (ex: http://127.0.0.1:11434)"
            placeholderTextColor={COLORS.textLight}
            value={avatarConfig.ollamaEndpoint}
            onChangeText={(v) => update('ollamaEndpoint', v)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Modele (ex: llama3.1:8b)"
            placeholderTextColor={COLORS.textLight}
            value={avatarConfig.ollamaModel}
            onChangeText={(v) => update('ollamaModel', v)}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.endpointHint}>Astuce: Android emulator utilise souvent http://10.0.2.2:11434. iOS simulator peut utiliser http://127.0.0.1:11434.</Text>

          {/* Detail level */}
          <Text style={styles.sectionTitle}>Niveau de detail des conseils</Text>
          <View style={styles.optionRow}>
            {DETAIL_LEVELS.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[styles.optionChip, avatarConfig.detailLevel === d.key && styles.optionChipActive]}
                onPress={() => update('detailLevel', d.key)}
              >
                <Text style={[styles.optionChipText, avatarConfig.detailLevel === d.key && styles.optionChipTextActive]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reminder frequency */}
          <Text style={styles.sectionTitle}>Frequence des rappels</Text>
          <View style={styles.optionRow}>
            {REMINDER_FREQ.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.optionChip, avatarConfig.reminderFrequency === r.key && styles.optionChipActive]}
                onPress={() => update('reminderFrequency', r.key)}
              >
                <Text style={[styles.optionChipText, avatarConfig.reminderFrequency === r.key && styles.optionChipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Demo data */}
          <TouchableOpacity style={styles.demoBtn} onPress={() => { loadDemoData(); Alert.alert('Donnees demo chargees'); }}>
            <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
            <Text style={styles.demoBtnText}>Charger les donnees demo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.dark },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.white + 'CC', marginTop: 4 },
  body: { padding: 20, paddingBottom: 100 },
  previewCard: { alignItems: 'center', marginBottom: 16 },
  previewName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  previewType: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 16 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  optionChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionChipText: { fontSize: 13, color: COLORS.text },
  optionChipTextActive: { color: COLORS.white, fontWeight: '600' },
  hintText: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic', marginVertical: 8 },
  engineCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 14, marginTop: 10,
  },
  engineCardActive: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08',
  },
  engineCardLeft: { flex: 1 },
  engineCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  engineCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  engineCardTitleActive: { color: COLORS.primary },
  engineBadgeActive: {
    backgroundColor: COLORS.primary, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  engineBadgeText: { fontSize: 10, color: COLORS.white, fontWeight: '600' },
  engineCardInfo: { fontSize: 12, color: COLORS.textLight, marginBottom: 5 },
  engineCardInfoActive: { color: COLORS.primary + 'BB' },
  engineCardStats: { flexDirection: 'row', alignItems: 'center' },
  engineStat: { fontSize: 11, color: COLORS.textLight },
  engineStatDot: { fontSize: 11, color: COLORS.textLight },
  engineStatActive: { color: COLORS.primary + 'AA' },
  engineServerHint: {
    fontSize: 10, color: COLORS.primary, fontStyle: 'italic',
    marginTop: 5, fontFamily: 'Courier',
  },
  engineRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  engineRadioActive: { borderColor: COLORS.primary },
  engineRadioDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  switchTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  switchHint: { fontSize: 11, color: COLORS.textLight, marginTop: 2, lineHeight: 16 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: COLORS.text,
    marginTop: 8,
  },
  endpointHint: { fontSize: 11, color: COLORS.textLight, marginTop: 6, lineHeight: 16 },
  demoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary, marginTop: 32,
  },
  demoBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
});

export default AvatarProfileScreen;
