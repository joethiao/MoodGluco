import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const MOODS = [
  { value: 1, emoji: '😢', label: 'Tres mal', color: '#FF6B6B' },
  { value: 2, emoji: '😟', label: 'Mal', color: '#FFA500' },
  { value: 3, emoji: '😐', label: 'Moyen', color: '#FFD700' },
  { value: 4, emoji: '🙂', label: 'Bien', color: '#90EE90' },
  { value: 5, emoji: '😄', label: 'Tres bien', color: '#06D6A0' },
];

const MoodTrackingScreen = () => {
  const { moods, addMood, setAvatarMessage, setAvatarExpanded } = useApp();
  const [currentMood, setCurrentMood] = useState(3);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    addMood({ timestamp: new Date().toISOString(), mood: currentMood, note });
    setSaved(true);
    setAvatarMessage(
      currentMood >= 4
        ? 'Content de voir que vous allez bien !'
        : 'Je suis la pour vous aider. Courage !'
    );
    setAvatarExpanded(true);
    setTimeout(() => setSaved(false), 2000);
    setNote('');
  };

  const currentEmoji = MOODS.find((m) => m.value === currentMood);
  const recentMoods = [...moods].reverse().slice(0, 8);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comment vous sentez-vous ?</Text>
          <Text style={styles.headerSub}>Notez votre humeur en 2 secondes</Text>
        </View>

        <View style={styles.body}>
          {/* Mood selector */}
          <View style={styles.card}>
            <Text style={styles.bigEmoji}>{currentEmoji?.emoji}</Text>
            <Text style={styles.moodLabel}>{currentEmoji?.label}</Text>

            <View style={styles.emojiRow}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setCurrentMood(m.value)}
                  style={[styles.emojiBtn, currentMood === m.value && styles.emojiBtnActive]}
                >
                  <Text style={[styles.emojiText, currentMood === m.value && styles.emojiTextActive]}>
                    {m.emoji}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Slider visual */}
            <View style={styles.sliderRow}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => setCurrentMood(m.value)}
                  style={[
                    styles.sliderDot,
                    { backgroundColor: currentMood >= m.value ? m.color : COLORS.muted },
                  ]}
                />
              ))}
            </View>

            <TextInput
              style={styles.noteInput}
              placeholder="Qu'est-ce qui influence votre humeur ? (optionnel)"
              placeholderTextColor={COLORS.textLight}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saved && styles.saveBtnDone]}
              onPress={handleSave}
              disabled={saved}
            >
              {saved ? (
                <View style={styles.saveBtnRow}>
                  <Ionicons name="checkmark" size={18} color={COLORS.white} />
                  <Text style={styles.saveBtnText}>Enregistre !</Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Recent entries */}
          {recentMoods.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Entrees recentes</Text>
              {recentMoods.map((mood) => {
                const emoji = MOODS.find((m) => m.value === mood.mood);
                return (
                  <View key={mood.id} style={styles.entryCard}>
                    <Text style={styles.entryEmoji}>{emoji?.emoji}</Text>
                    <View style={styles.entryContent}>
                      <Text style={styles.entryLabel}>{emoji?.label}</Text>
                      <Text style={styles.entryTime}>
                        {new Date(mood.timestamp).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                      {mood.note ? <Text style={styles.entryNote}>{mood.note}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Tip */}
          <View style={styles.tipCard}>
            <Ionicons name="heart" size={16} color={COLORS.coral} />
            <Text style={styles.tipText}>
              Notez votre humeur plusieurs fois par jour pour identifier des patterns avec votre glycemie.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.orange },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.orange, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.white + 'CC', marginTop: 4 },
  body: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  bigEmoji: { fontSize: 64, marginBottom: 8 },
  moodLabel: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 20 },
  emojiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  emojiBtn: { padding: 8, borderRadius: 12 },
  emojiBtnActive: { backgroundColor: COLORS.muted },
  emojiText: { fontSize: 28, opacity: 0.5 },
  emojiTextActive: { opacity: 1, fontSize: 32 },
  sliderRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sliderDot: { width: 40, height: 6, borderRadius: 3 },
  noteInput: {
    width: '100%', backgroundColor: COLORS.background, borderRadius: 14, padding: 14,
    fontSize: 14, color: COLORS.text, minHeight: 70, textAlignVertical: 'top', marginBottom: 16,
  },
  saveBtn: {
    width: '100%', backgroundColor: COLORS.orange, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDone: { backgroundColor: "#FF6B35" },
  saveBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 24, marginBottom: 12 },
  entryCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  entryEmoji: { fontSize: 24 },
  entryContent: { flex: 1 },
  entryLabel: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  entryTime: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  entryNote: { fontSize: 12, color: COLORS.text + 'AA', marginTop: 4 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: "#FF6B35" + '10', borderRadius: 14, padding: 14, marginTop: 16,
  },
  tipText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },
});

export default MoodTrackingScreen;
