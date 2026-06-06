import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, TextInput, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const FamilyScreen = ({ navigation }) => {
  const { familyMembers, addFamilyMember } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [perms, setPerms] = useState({
    viewMood: true, viewGlucose: true, viewMeals: false, viewMedications: true, receiveAlerts: true,
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    addFamilyMember({
      id: Date.now().toString(),
      name, email, relationship,
      permissions: perms,
    });
    setName(''); setEmail(''); setRelationship('');
    setShowAdd(false);
    Alert.alert('Ajoute', `${name} a ete ajoute a votre cercle familial.`);
  };

  const permLabels = [
    { key: 'viewMood', label: 'Voir mon humeur', icon: 'happy-outline' },
    { key: 'viewGlucose', label: 'Voir ma glycemie', icon: 'water-outline' },
    { key: 'viewMeals', label: 'Voir mes repas', icon: 'restaurant-outline' },
    { key: 'viewMedications', label: 'Voir mes medicaments', icon: 'medkit-outline' },
    { key: 'receiveAlerts', label: 'Recevoir les alertes', icon: 'notifications-outline' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: '#8B5CF6' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Famille</Text>
          <Text style={styles.headerSub}>Votre cercle de soutien</Text>
        </View>

        <View style={styles.body}>
          {/* Info card */}
          <View style={styles.infoCard}>
            <Ionicons name="heart-outline" size={20} color={COLORS.coral} />
            <Text style={styles.infoText}>
              Un "Bravo" de votre proche motive plus qu'une notification automatique. Invitez vos proches a vous soutenir.
            </Text>
          </View>

          {/* Family members */}
          {familyMembers.length === 0 && !showAdd ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Aucun membre ajoute</Text>
              <Text style={styles.emptyHint}>Invitez un proche pour qu'il puisse suivre votre sante</Text>
            </View>
          ) : (
            familyMembers.map((m) => (
              <View key={m.id} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Ionicons name="person" size={24} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRel}>{m.relationship}</Text>
                  <View style={styles.permTags}>
                    {m.permissions.viewMood && <View style={styles.permTag}><Text style={styles.permTagText}>Humeur</Text></View>}
                    {m.permissions.viewGlucose && <View style={styles.permTag}><Text style={styles.permTagText}>Glycemie</Text></View>}
                    {m.permissions.receiveAlerts && <View style={styles.permTag}><Text style={styles.permTagText}>Alertes</Text></View>}
                  </View>
                </View>
              </View>
            ))
          )}

          {/* Add member */}
          {!showAdd ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
              <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Inviter un proche</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addCard}>
              <Text style={styles.addCardTitle}>Nouveau membre</Text>
              <TextInput style={styles.input} placeholder="Prenom" placeholderTextColor={COLORS.textLight} value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.textLight} value={email} onChangeText={setEmail} keyboardType="email-address" />
              <TextInput style={styles.input} placeholder="Relation (ex: Fille, Conjoint)" placeholderTextColor={COLORS.textLight} value={relationship} onChangeText={setRelationship} />

              <Text style={styles.permTitle}>Permissions de partage</Text>
              {permLabels.map((p) => (
                <View key={p.key} style={styles.permRow}>
                  <Ionicons name={p.icon} size={18} color={COLORS.textLight} />
                  <Text style={styles.permLabel}>{p.label}</Text>
                  <Switch
                    value={perms[p.key]}
                    onValueChange={(v) => setPerms({ ...perms, [p.key]: v })}
                    trackColor={{ false: COLORS.muted, true: COLORS.primary + '60' }}
                    thumbColor={perms[p.key] ? COLORS.primary : '#ccc'}
                  />
                </View>
              ))}

              <View style={styles.addActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                  <Text style={styles.confirmBtnText}>Inviter</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#8B5CF6' },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.white + 'CC', marginTop: 4 },
  body: { padding: 20, paddingBottom: 100 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.coral + '10', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8, marginBottom: 16 },
  emptyText: { fontSize: 14, color: COLORS.textLight },
  emptyHint: { fontSize: 12, color: COLORS.textLight, textAlign: 'center' },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 10,
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  memberRel: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  permTags: { flexDirection: 'row', gap: 6, marginTop: 6 },
  permTag: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  permTagText: { fontSize: 10, color: COLORS.primary, fontWeight: '500' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', marginTop: 8,
  },
  addBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  addCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, gap: 12, marginTop: 8 },
  addCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.text },
  permTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  permLabel: { flex: 1, fontSize: 13, color: COLORS.text },
  addActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: COLORS.textLight },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#8B5CF6', alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
});

export default FamilyScreen;
