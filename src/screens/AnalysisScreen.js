import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const AnalysisScreen = () => {
  const { moods, glucose, meals } = useApp();

  // Detect patterns
  const detectPatterns = () => {
    const patterns = [];
    const eveningMoods = moods.filter((m) => {
      const h = new Date(m.timestamp).getHours();
      return h >= 18 && h <= 23 && m.mood <= 2;
    });
    if (eveningMoods.length >= 2) {
      patterns.push({
        icon: 'moon-outline',
        color: COLORS.coral,
        title: 'Stress le soir',
        desc: `${eveningMoods.length} fois cette semaine, votre humeur etait basse le soir. Cela coincide souvent avec du grignotage.`,
      });
    }

    const highGlucose = glucose.filter((g) => g.value > 140);
    if (highGlucose.length >= 3) {
      patterns.push({
        icon: 'trending-up',
        color: COLORS.orange,
        title: 'Pics de glycemie frequents',
        desc: `${highGlucose.length} mesures au-dessus de 140 mg/dL cette semaine. Verifiez les repas qui precedent ces pics.`,
      });
    }

    const lowMoodHighGlucose = moods.filter((m) => {
      if (m.mood > 2) return false;
      const moodTime = new Date(m.timestamp).getTime();
      return glucose.some((g) => {
        const gTime = new Date(g.timestamp).getTime();
        return Math.abs(gTime - moodTime) < 7200000 && g.value > 140;
      });
    });
    if (lowMoodHighGlucose.length >= 1) {
      patterns.push({
        icon: 'alert-circle-outline',
        color: COLORS.coral,
        title: 'Lien emotion / glycemie detecte',
        desc: 'Quand vous etes stresse, votre glycemie monte. Le grignotage emotionnel pourrait en etre la cause.',
      });
    }

    if (meals.length >= 3) {
      const highImpact = meals.filter((m) => m.glycemicImpact === 'high');
      if (highImpact.length >= 2) {
        patterns.push({
          icon: 'restaurant-outline',
          color: COLORS.orange,
          title: 'Repas a impact glycemique eleve',
          desc: `${highImpact.length} repas a fort impact cette semaine. L'avatar peut vous suggerer des alternatives.`,
        });
      }
    }

    if (patterns.length === 0) {
      patterns.push({
        icon: 'analytics-outline',
        color: COLORS.primary,
        title: 'Continuez le suivi',
        desc: 'Plus vous enregistrez de donnees, plus les patterns seront precis. Notez votre humeur et vos repas chaque jour.',
      });
    }

    return patterns;
  };

  const patterns = detectPatterns();

  // Stats
  const avgMood = moods.length > 0 ? (moods.reduce((a, m) => a + m.mood, 0) / moods.length).toFixed(1) : '-';
  const avgGlucose = glucose.length > 0 ? Math.round(glucose.reduce((a, g) => a + g.value, 0) / glucose.length) : '-';
  const totalMeals = meals.length;
  const moodEntries = moods.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: COLORS.primary }]}>
          <Text style={styles.headerTitle}>Analyses</Text>
          <Text style={styles.headerSub}>Vos patterns et tendances</Text>
        </View>

        <View style={styles.body}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="happy-outline" size={22} color={COLORS.orange} />
              <Text style={styles.statValue}>{avgMood}</Text>
              <Text style={styles.statLabel}>Humeur moy.</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="water-outline" size={22} color={COLORS.primary} />
              <Text style={styles.statValue}>{avgGlucose}</Text>
              <Text style={styles.statLabel}>Glycemie moy.</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="restaurant-outline" size={22} color={COLORS.coral} />
              <Text style={styles.statValue}>{totalMeals}</Text>
              <Text style={styles.statLabel}>Repas</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="pulse-outline" size={22} color={COLORS.secondary} />
              <Text style={styles.statValue}>{moodEntries}</Text>
              <Text style={styles.statLabel}>Entrees humeur</Text>
            </View>
          </View>

          {/* Patterns */}
          <Text style={styles.sectionTitle}>Patterns detectes</Text>
          {patterns.map((p, i) => (
            <View key={i} style={styles.patternCard}>
              <View style={[styles.patternIcon, { backgroundColor: p.color + '20' }]}>
                <Ionicons name={p.icon} size={22} color={p.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patternTitle}>{p.title}</Text>
                <Text style={styles.patternDesc}>{p.desc}</Text>
              </View>
            </View>
          ))}

          {/* Glucose mini chart (text-based) */}
          {glucose.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Glycemie (7 derniers jours)</Text>
              <View style={styles.chartCard}>
                {glucose.slice(-7).map((g, i) => {
                  const maxH = 80;
                  const h = Math.min(maxH, Math.max(10, ((g.value - 70) / 100) * maxH));
                  const color = g.value > 140 ? COLORS.coral : g.value > 120 ? COLORS.orange : COLORS.secondary;
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={styles.barValue}>{g.value}</Text>
                      <View style={[styles.bar, { height: h, backgroundColor: color }]} />
                      <Text style={styles.barLabel}>
                        {new Date(g.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Mood mini chart */}
          {moods.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Humeur (7 derniers jours)</Text>
              <View style={styles.chartCard}>
                {moods.slice(-7).map((m, i) => {
                  const emojis = ['', '😢', '😟', '😐', '🙂', '😄'];
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={{ fontSize: 20 }}>{emojis[m.mood]}</Text>
                      <View style={[styles.bar, { height: m.mood * 16, backgroundColor: COLORS.orange }]} />
                      <Text style={styles.barLabel}>
                        {new Date(m.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.white + 'CC', marginTop: 4 },
  body: { padding: 20, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textLight },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  patternCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  patternIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  patternTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  patternDesc: { fontSize: 12, color: COLORS.textLight, lineHeight: 18 },
  chartCard: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, minHeight: 140,
  },
  barCol: { alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, color: COLORS.textLight },
  bar: { width: 24, borderRadius: 4 },
  barLabel: { fontSize: 8, color: COLORS.textLight },
});

export default AnalysisScreen;
