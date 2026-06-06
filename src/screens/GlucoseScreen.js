import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const TILES = [
  { id: 'mesure',   icon: 'water',      label: 'Mesurer\nma glycémie',  color: COLORS.primary, screen: 'GlucoseMesure' },
  { id: 'history',  icon: 'bar-chart',  label: 'Mon\nhistorique',       color: '#8B5CF6',      screen: 'GlucoseHistorique' },
  { id: 'bilan',    icon: 'clipboard',  label: 'Mon bilan\ndu jour',    color: '#10B981',      screen: 'GlucoseBilan' },
  { id: 'medecin',  icon: 'call',       label: 'Mon\nmédecin',          color: '#EF4444',      screen: 'GlucoseMedecin' },
];

const GlucoseScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Suivi Santé</Text>
      </View>
      <View style={styles.grid}>
        {[0, 1].map((row) => (
          <View key={row} style={styles.gridRow}>
            {TILES.slice(row * 2, row * 2 + 2).map((tile) => (
              <TouchableOpacity
                key={tile.id}
                style={[styles.tile, { backgroundColor: tile.color }]}
                onPress={() => navigation.navigate(tile.screen)}
                activeOpacity={0.82}
              >
                <Ionicons name={tile.icon} size={42} color="#fff" />
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  header: {
    height: 56, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  grid: { flex: 1, backgroundColor: COLORS.background },
  gridRow: { flex: 1, flexDirection: 'row' },
  tile: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
  },
  tileLabel: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 22 },
});

export default GlucoseScreen;

