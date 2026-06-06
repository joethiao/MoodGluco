import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const GlucoseMedecinScreen = ({ navigation }) => {
  const { userProfile } = useApp();

  const name    = userProfile?.doctorFullName || userProfile?.doctorName;
  const address = userProfile?.doctorAddress;
  const phone   = userProfile?.doctorPhone;

  const handleCall = () => {
    if (!phone) {
      Alert.alert('Aucun numéro', "Vous n'avez pas encore renseigné le téléphone de votre médecin.");
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleMaps = () => {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    Linking.openURL(`maps://?q=${encoded}`).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${encoded}`)
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={"#FF6B35"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon médecin</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={"#FF6B35"} />
          </View>
          <Text style={styles.doctorName}>{name || 'Médecin non renseigné'}</Text>
          {!!address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.infoText}>{address}</Text>
            </View>
          )}
          {!!phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.infoText}>{phone}</Text>
            </View>
          )}
          {!name && !address && !phone && (
            <Text style={styles.emptyHint}>
              Ces informations se renseignent lors de la configuration initiale de l'application.
            </Text>
          )}
        </View>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#FF6B35" }]} onPress={handleCall}>
          <Ionicons name="call" size={22} color="#fff" />
          <Text style={styles.actionBtnText}>Appeler le cabinet</Text>
        </TouchableOpacity>

        {!!address && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={handleMaps}>
            <Ionicons name="navigate" size={22} color="#fff" />
            <Text style={styles.actionBtnText}>Ouvrir dans Plans</Text>
          </TouchableOpacity>
        )}

        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={14} color={COLORS.textLight} />
          <Text style={styles.privacyText}>
            Ces informations sont stockées uniquement sur votre appareil.
          </Text>
        </View>
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
  body: { flex: 1, backgroundColor: COLORS.background, padding: 20, gap: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#FF6B35" + '18', justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  doctorName: { fontSize: 20, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, width: '100%' },
  infoText: { flex: 1, fontSize: 14, color: COLORS.textLight, lineHeight: 20 },
  emptyHint: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', lineHeight: 20, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 16, paddingVertical: 16,
  },
  actionBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  privacyNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 8, marginTop: 4,
  },
  privacyText: { flex: 1, fontSize: 12, color: COLORS.textLight },
});

export default GlucoseMedecinScreen;
