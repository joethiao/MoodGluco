import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const GlucoseHistoriqueScreen = ({ navigation }) => {
  const { glucose } = useApp();

  const getColor = (v) => (v > 180 || v < 70 ? COLORS.danger : COLORS.success);
  const getLabel = (v) => (v > 180 ? 'Élevée' : v < 70 ? 'Basse' : 'Normale');

  const entries = [...glucose].reverse();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={"#FF6B35"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon historique</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={52} color={COLORS.muted} />
            <Text style={styles.emptyText}>Aucune mesure enregistrée.</Text>
            <Text style={styles.emptyHint}>Commencez par mesurer votre glycémie.</Text>
          </View>
        ) : (
          entries.map((g) => (
            <View key={g.id} style={styles.row}>
              <View style={[styles.colorBar, { backgroundColor: getColor(g.value) }]} />
              <View style={styles.rowMain}>
                <Text style={styles.rowValue}>{g.value} <Text style={styles.rowUnit}>mg/dL</Text></Text>
                {!!g.context && <Text style={styles.rowContext}>{g.context}</Text>}
              </View>
              <View style={styles.rowRight}>
                <View style={[styles.badge, { backgroundColor: getColor(g.value) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getColor(g.value) }]}>{getLabel(g.value)}</Text>
                </View>
                <Text style={styles.rowTime}>
                  {new Date(g.timestamp).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
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
  bodyInner: { padding: 20, paddingBottom: 40, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptyHint: { fontSize: 14, color: COLORS.textLight },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  colorBar: { width: 5, alignSelf: 'stretch' },
  rowMain: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  rowValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  rowUnit: { fontSize: 13, fontWeight: '400', color: COLORS.textLight },
  rowContext: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  rowRight: { paddingRight: 14, alignItems: 'flex-end', gap: 4 },
  badge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  rowTime: { fontSize: 11, color: COLORS.textLight },
});

export default GlucoseHistoriqueScreen;
