import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const GlucoseMesureScreen = ({ navigation }) => {
  const { addGlucose, setAvatarMessage, setAvatarExpanded } = useApp();
  const [value, setValue] = useState('');

  const appendDigit = (digit) => {
    if (value.length >= 3) return;
    setValue((prev) => `${prev}${digit}`);
  };

  const clearOne = () => setValue((prev) => prev.slice(0, -1));

  const getColor = (v) => (v > 180 || v < 70 ? COLORS.danger : COLORS.success);

  const handleSave = () => {
    const v = parseInt(value);
    if (!v || v < 30 || v > 500) {
      Alert.alert('Erreur', 'Entrez une valeur entre 30 et 500 mg/dL');
      return;
    }
    addGlucose({ timestamp: new Date().toISOString(), value: v });
    const msg =
      v > 180 ? "Alerte : glycémie élevée. Buvez de l'eau et suivez votre plan de soin." :
      v < 70  ? 'Alerte : glycémie basse. Prenez un en-cas sucré maintenant.' :
                'Glycémie dans la normale. Très bien !';
    setAvatarMessage(msg);
    setAvatarExpanded(true);
    navigation.goBack();
  };

  const numVal = parseInt(value) || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={"#FF6B35"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mesurer ma glycémie</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.displayCard}>
          <Text style={styles.bigValue}>{value || '---'}</Text>
          <Text style={styles.unit}>mg/dL</Text>
          {!!value && (
            <View style={[styles.badge, { backgroundColor: getColor(numVal) + '22' }]}>
              <Text style={[styles.badgeText, { color: getColor(numVal) }]}>
                {numVal > 180 || numVal < 70 ? '⚠ Hors zone cible' : '✓ Zone normale'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.padGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <TouchableOpacity key={d} style={styles.padBtn} onPress={() => appendDigit(d)}>
              <Text style={styles.padBtnText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.padBtn, styles.padAction]} onPress={() => setValue('')}>
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.padBtn} onPress={() => appendDigit(0)}>
            <Text style={styles.padBtnText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.padBtn, styles.padAction]} onPress={clearOne}>
            <Ionicons name="backspace-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, !value && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!value}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>
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
  body: { flex: 1, backgroundColor: COLORS.background, padding: 24, alignItems: 'center', gap: 20 },
  displayCard: {
    width: '100%', backgroundColor: COLORS.white, borderRadius: 20,
    paddingVertical: 28, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  bigValue: { fontSize: 64, fontWeight: '800', color: "#FF6B35" },
  unit: { fontSize: 15, color: COLORS.textLight },
  badge: { marginTop: 4, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 16 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  padGrid: {
    width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10,
  },
  padBtn: {
    width: '31%', backgroundColor: COLORS.white, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  padAction: { backgroundColor: COLORS.muted },
  padBtnText: { fontSize: 26, fontWeight: '700', color: COLORS.text },
  saveBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: "#FF6B35", borderRadius: 16, paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});

export default GlucoseMesureScreen;
