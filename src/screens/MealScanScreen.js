import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Image, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const MealScanScreen = () => {
  const { meals, addMeal, setAvatarMessage, setAvatarExpanded } = useApp();
  const [mealName, setMealName] = useState('');
  const [carbs, setCarbs] = useState('');
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setMealName('Salade cesar');
      setCarbs('30');
      setAvatarMessage('J\'ai analyse votre repas : environ 30g de glucides. Impact glycemique modere.');
      setAvatarExpanded(true);
    }, 1500);
  };

  const handleSave = () => {
    if (!mealName) return;
    addMeal({
      timestamp: new Date().toISOString(),
      name: mealName,
      carbs: parseInt(carbs) || 0,
      glycemicImpact: parseInt(carbs) < 30 ? 'low' : parseInt(carbs) < 50 ? 'medium' : 'high',
    });
    setMealName('');
    setCarbs('');
    Alert.alert('Enregistre', 'Votre repas a ete enregistre.');
  };

  const impactColor = (impact) => {
    if (impact === 'low') return COLORS.secondary;
    if (impact === 'medium') return COLORS.orange;
    return COLORS.coral;
  };

  const impactLabel = (impact) => {
    if (impact === 'low') return 'Faible';
    if (impact === 'medium') return 'Modere';
    return 'Eleve';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: COLORS.coral }]}>
          <Text style={styles.headerTitle}>Scanner un repas</Text>
          <Text style={styles.headerSub}>Photographiez votre assiette</Text>
        </View>

        <View style={styles.body}>
          {/* Scan area */}
          <TouchableOpacity style={styles.scanArea} onPress={handleScan}>
            <View style={styles.scanInner}>
              {scanning ? (
                <>
                  <Ionicons name="hourglass" size={40} color={COLORS.primary} />
                  <Text style={styles.scanText}>Analyse en cours...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.scanText}>Appuyez pour scanner</Text>
                  <Text style={styles.scanHint}>ou entrez manuellement ci-dessous</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Manual entry */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entree manuelle</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du repas"
              placeholderTextColor={COLORS.textLight}
              value={mealName}
              onChangeText={setMealName}
            />
            <TextInput
              style={styles.input}
              placeholder="Glucides estimes (g)"
              placeholderTextColor={COLORS.textLight}
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Enregistrer le repas</Text>
            </TouchableOpacity>
          </View>

          {/* Recent meals */}
          {meals.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Repas recents</Text>
              {[...meals].reverse().slice(0, 5).map((meal) => (
                <View key={meal.id} style={styles.mealCard}>
                  <Ionicons name="restaurant-outline" size={20} color={COLORS.coral} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealName}>{meal.name || 'Repas'}</Text>
                    <Text style={styles.mealTime}>
                      {new Date(meal.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {meal.glycemicImpact && (
                    <View style={[styles.impactBadge, { backgroundColor: impactColor(meal.glycemicImpact) + '20' }]}>
                      <Text style={[styles.impactText, { color: impactColor(meal.glycemicImpact) }]}>
                        {impactLabel(meal.glycemicImpact)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.coral },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.white + 'CC', marginTop: 4 },
  body: { padding: 20, paddingBottom: 100 },
  scanArea: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 4, marginBottom: 16,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  scanInner: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  scanText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  scanHint: { fontSize: 12, color: COLORS.textLight },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  input: {
    backgroundColor: COLORS.background, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.text,
  },
  saveBtn: { backgroundColor: COLORS.coral, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 8, marginBottom: 12 },
  mealCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  mealName: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  mealTime: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  impactBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  impactText: { fontSize: 11, fontWeight: '600' },
});

export default MealScanScreen;
