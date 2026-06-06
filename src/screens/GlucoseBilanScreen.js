import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const GlucoseBilanScreen = ({ navigation }) => {
  const { glucose } = useApp();

  const today = new Date().toDateString();
  const todayEntries = glucose.filter((g) => new Date(g.timestamp).toDateString() === today);
  const todayValues = todayEntries.map((g) => g.value);

  const getColor = (v) => (v > 180 || v < 70 ? COLORS.danger : COLORS.success);

  const stats = useMemo(() => {
    if (todayValues.length === 0) return null;
    const min = Math.min(...todayValues);
    const max = Math.max(...todayValues);
    const avg = Math.round(todayValues.reduce((a, b) => a + b, 0) / todayValues.length);
    const inRange = todayValues.filter((v) => v >= 70 && v <= 180).length;
    return { min, max, avg, count: todayValues.length, inRange };
  }, [todayValues]);

  const summary = stats
    ? stats.max <= 180 && stats.min >= 70
      ? "Votre glycémie est bien équilibrée aujourd'hui. Continuez ainsi !"
      : "Votre glycémie a dépassé la zone cible aujourd'hui. Consultez votre plan de soin."
    : "Aucune mesure enregistrée aujourd'hui.";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={"#FF6B35"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon bilan du jour</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
        <View style={[styles.summaryCard, { borderLeftColor: stats ? (stats.max <= 180 && stats.min >= 70 ? COLORS.success : COLORS.danger) : COLORS.muted }]}>
          <Ionicons
            name={stats ? (stats.max <= 180 && stats.min >= 70 ? 'checkmark-circle' : 'warning') : 'information-circle'}
            size={28}
            color={stats ? (stats.max <= 180 && stats.min >= 70 ? COLORS.success : COLORS.danger) : COLORS.muted}
          />
          <Text style={styles.summaryText}>{summary}</Text>
        </View>

        {stats ? (
          <View style={styles.statsGrid}>
            {[
              { label: 'Mesures', value: stats.count, icon: 'list' },
              { label: 'Moyenne', value: `${stats.avg} mg/dL`, icon: 'analytics' },
              { label: 'Minimum', value: `${stats.min} mg/dL`, icon: 'arrow-down' },
              { label: 'Maximum', value: `${stats.max} mg/dL`, icon: 'arrow-up' },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Ionicons name={s.icon} size={20} color={"#FF6B35"} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={52} color={COLORS.muted} />
            <Text style={styles.emptyHint}>Enregistrez une mesure pour voir votre bilan.</Text>
          </View>
        )}

        {todayEntries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Mesures d'aujourd'hui</Text>
            {[...todayEntries].reverse().map((g) => (
              <View key={g.id} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: getColor(g.value) }]} />
                <Text style={styles.rowValue}>{g.value} mg/dL</Text>
                {!!g.context && <Text style={styles.rowContext}>({g.context})</Text>}
                <Text style={styles.rowTime}>
                  {new Date(g.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FF6B35" },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, backgroundColor: "#FF6B35",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  body: { flex: 1, backgroundColor: COLORS.background },
  bodyInner: { padding: 20, paddingBottom: 40, gap: 14 },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    borderLeftWidth: 5,
  },
  summaryText: { flex: 1, fontSize: 15, color: COLORS.text, lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%', backgroundColor: COLORS.white, borderRadius: 14,
    padding: 16, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyHint: { fontSize: 14, color: COLORS.textLight, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  rowContext: { fontSize: 12, color: COLORS.textLight },
  rowTime: { fontSize: 12, color: COLORS.textLight },
});

export default GlucoseBilanScreen;
