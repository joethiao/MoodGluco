import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';
import { initNotifications, MEDICATION_PRECALL_TYPE, sendLocalNotification } from '../services/notificationService';

const MedicationsScreen = ({ navigation }) => {
    const handleBack = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.navigate('AssistantTab');
    };

  const {
    medications,
    addMedication,
    toggleMedicationTaken,
    setAvatarMessage,
    setAvatarExpanded,
    familyMembers,
    avatarConfig,
  } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newSchedule, setNewSchedule] = useState('');
  const [question, setQuestion] = useState('');
  const [lastAvatarReply, setLastAvatarReply] = useState('');
  const [nowMinutes, setNowMinutes] = useState(new Date().getHours() * 60 + new Date().getMinutes());
  const [sentFamilyAlert, setSentFamilyAlert] = useState({});
  const remindedRef = useRef({});
  const fakeCallRef = useRef({});
  const notificationPermissionAskedRef = useRef(false);

  const todayKey = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const toMinutes = (hhmm) => {
    const [h, m] = (hhmm || '').split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const dueMedications = useMemo(() => {
    return medications.filter((med) => {
      if (med.taken[todayKey]) return false;
      return med.schedule.some((time) => {
        const minutes = toMinutes(time);
        if (minutes === null) return false;
        return nowMinutes >= minutes && nowMinutes - minutes <= 60;
      });
    });
  }, [medications, nowMinutes, todayKey]);

  const missedMedications = useMemo(() => {
    return medications.filter((med) => {
      if (med.taken[todayKey]) return false;
      return med.schedule.some((time) => {
        const minutes = toMinutes(time);
        if (minutes === null) return false;
        return nowMinutes - minutes > 60;
      });
    });
  }, [medications, nowMinutes, todayKey]);

  const preDueMedications = useMemo(() => {
    return medications
      .map((med) => {
        if (med.taken[todayKey]) return null;
        const hit = med.schedule.find((time) => {
          const minutes = toMinutes(time);
          if (minutes === null) return false;
          return nowMinutes >= minutes - 5 && nowMinutes < minutes;
        });
        if (!hit) return null;
        return { med, time: hit };
      })
      .filter(Boolean);
  }, [medications, nowMinutes, todayKey]);

  useEffect(() => {
    if (notificationPermissionAskedRef.current) return;
    notificationPermissionAskedRef.current = true;
    initNotifications();
  }, []);

  useEffect(() => {
    if (dueMedications.length === 0) return;
    const due = dueMedications[0];
    const key = `${todayKey}-${due.id}`;
    if (remindedRef.current[key]) return;

    remindedRef.current[key] = true;
    const reminder = `C'est l'heure de votre ${due.name}. Appuyez sur le bouton Je l'ai pris.`;
    setAvatarMessage(reminder);
    setAvatarExpanded(true);
    sendLocalNotification({
      title: 'Rappel medicament',
      body: `Il est l'heure de ${due.name}. Ouvrez MoodGluco pour confirmer la prise.`,
      data: { type: 'medication_due', medId: due.id },
    });
  }, [dueMedications, setAvatarExpanded, setAvatarMessage, todayKey]);

  useEffect(() => {
    if (!avatarConfig.notifyFamilyOnMissedMed || missedMedications.length === 0) return;
    const closeContact = familyMembers.find((m) => m.permissions?.receiveAlerts);
    if (!closeContact) return;

    const firstMissed = missedMedications[0];
    const alertKey = `${todayKey}-${firstMissed.id}`;
    if (sentFamilyAlert[alertKey]) return;

    setSentFamilyAlert((prev) => ({ ...prev, [alertKey]: true }));
    sendLocalNotification({
      title: 'Alerte oubli traitement',
      body: `${firstMissed.name} n'a pas encore ete confirme aujourd'hui.`,
      data: { type: 'medication_missed', medId: firstMissed.id },
    });
    Alert.alert(
      'Alerte oubli traitement',
      `Un rappel serait envoye a ${closeContact.name} pour ${firstMissed.name} (mode demo).`
    );
  }, [avatarConfig.notifyFamilyOnMissedMed, familyMembers, missedMedications, sentFamilyAlert, todayKey]);

  useEffect(() => {
    if (preDueMedications.length === 0) return;
    const first = preDueMedications[0];
    const callKey = `${todayKey}-${first.med.id}-${first.time}`;
    if (fakeCallRef.current[callKey]) return;

    fakeCallRef.current[callKey] = true;
    setAvatarMessage(`Appel rappel: ${first.med.name} dans 5 minutes. C'est bientot l'heure.`);
    setAvatarExpanded(true);
    sendLocalNotification({
      title: 'Appel entrant: Mes medicaments',
      body: `${first.med.name} dans 5 min (${first.time}).`,
      data: {
        type: MEDICATION_PRECALL_TYPE,
        medId: first.med.id,
        medicationName: first.med.name,
        scheduledTime: first.time,
      },
    });
    navigation.navigate('MedicationCall', {
      medicationName: first.med.name,
      scheduledTime: first.time,
      source: 'auto-h-5',
    });
  }, [navigation, preDueMedications, setAvatarExpanded, setAvatarMessage, todayKey]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addMedication({
      id: Date.now().toString(),
      name: newName,
      dosage: newDosage,
      schedule: newSchedule.split(',').map((s) => s.trim()).filter(Boolean),
      taken: {},
    });
    setNewName('');
    setNewDosage('');
    setNewSchedule('');
    setShowAdd(false);
  };

  const getSimpleMedicationExplanation = (medName) => {
    const name = (medName || '').toLowerCase();
    if (name.includes('insuline')) return 'Insuline: elle aide le sucre a entrer dans vos cellules pour baisser la glycemie.';
    if (name.includes('metform')) return 'Metformine: elle diminue la production de sucre par le foie.';
    return 'Ce medicament aide a garder votre glycemie dans une zone plus sure.';
  };

  const confirmTaken = (med) => {
    toggleMedicationTaken(med.id, todayKey);
    const msg = `Bravo. ${med.name} est confirme comme pris.`;
    setAvatarMessage(msg);
    setAvatarExpanded(true);
  };

  const buildAvatarMedicationAnswer = (rawQuestion) => {
    const q = (rawQuestion || '').trim().toLowerCase();
    if (!q) return "Je peux vous aider sur vos horaires, doses, et statut de prise des medicaments.";

    const matchedMed = medications.find((m) => q.includes((m.name || '').toLowerCase()));
    const targetMed = matchedMed || medications[0];

    if (!targetMed) {
      return "Je ne vois pas encore de medicament enregistre. Ajoutez-en un et je vous aiderai tout de suite.";
    }

    const isTakenToday = !!targetMed.taken[todayKey];
    const scheduleText = targetMed.schedule?.length ? targetMed.schedule.join(' - ') : 'horaire non renseigne';

    if (q.includes('horaire') || q.includes('quand') || q.includes('heure')) {
      return `${targetMed.name}: horaires prevus ${scheduleText}.`;
    }
    if (q.includes('dose') || q.includes('dosage') || q.includes('combien')) {
      return `${targetMed.name}: dose enregistree ${targetMed.dosage || 'non renseignee'}.`;
    }
    if (q.includes('pris') || q.includes('prise') || q.includes('statut') || q.includes('oublie')) {
      return `${targetMed.name}: ${isTakenToday ? 'pris aujourd\'hui' : 'pas encore confirme aujourd\'hui'}.`;
    }
    if (q.includes('sert') || q.includes('pourquoi') || q.includes('a quoi')) {
      return getSimpleMedicationExplanation(targetMed.name);
    }

    return `${targetMed.name}: dose ${targetMed.dosage || 'non renseignee'}, horaires ${scheduleText}, statut du jour ${isTakenToday ? 'pris' : 'a prendre'}.`;
  };

  const askAvatarAboutMedication = () => {
    const reply = buildAvatarMedicationAnswer(question);
    setAvatarMessage(reply);
    setAvatarExpanded(true);
    setLastAvatarReply(reply);
  };

  const triggerWatchFriendlyAlert = async () => {
    const ok = await sendLocalNotification({
      title: 'MoodGluco - Alerte medicament',
      body: "Pensez a verifier vos medicaments du jour.",
      data: { type: 'manual_medication_alert' },
    });

    if (!ok) {
      Alert.alert(
        'Notifications desactivees',
        "Autorisez les notifications pour recevoir les alertes sur le telephone et la montre."
      );
      return;
    }
  };

  const triggerInAppCallDemo = () => {
    const targetMed = dueMedications[0] || medications[0];
    navigation.navigate('MedicationCall', {
      medicationName: targetMed?.name || 'Votre traitement',
      scheduledTime: targetMed?.schedule?.[0] || 'maintenant',
      source: 'manual-demo',
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: "#FF6B35" }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medicaments</Text>
          <Text style={styles.headerSub}>Suivi de vos traitements</Text>
        </View>

        <View style={styles.body}>
          {dueMedications.length > 0 && (
            <View style={styles.reminderCard}>
              <Ionicons name="alarm-outline" size={20} color={COLORS.white} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderTitle}>Rappel vocal actif</Text>
                <Text style={styles.reminderText}>C'est l'heure de {dueMedications[0].name}</Text>
              </View>
              <TouchableOpacity style={styles.confirmOneTap} onPress={() => confirmTaken(dueMedications[0])}>
                <Text style={styles.confirmOneTapText}>Je l'ai pris</Text>
              </TouchableOpacity>
            </View>
          )}

          {missedMedications.length > 0 && (
            <View style={styles.missedCard}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.missedText}>
                Vous n'avez pas encore pris votre {missedMedications[0].name}. {avatarConfig.notifyFamilyOnMissedMed ? 'Vos proches seront notifies.' : 'Notification aux proches desactivee.'}
              </Text>
            </View>
          )}

          <View style={styles.assistantCard}>
            <View style={styles.assistantHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={"#FF6B35"} />
              <Text style={styles.assistantTitle}>Question a l'avatar</Text>
            </View>
            <Text style={styles.assistantHint}>Ex: "A quelle heure je prends la metformine ?"</Text>
            <TextInput
              style={styles.input}
              placeholder="Posez une question sur vos medicaments"
              placeholderTextColor={COLORS.textLight}
              value={question}
              onChangeText={setQuestion}
            />
            <TouchableOpacity style={styles.askBtn} onPress={askAvatarAboutMedication}>
              <Text style={styles.askBtnText}>Demander a l'avatar</Text>
            </TouchableOpacity>
            {lastAvatarReply ? <Text style={styles.lastReply}>{lastAvatarReply}</Text> : null}
          </View>

          <TouchableOpacity style={styles.watchAlertBtn} onPress={triggerWatchFriendlyAlert}>
            <Ionicons name="notifications" size={16} color={COLORS.white} />
            <Text style={styles.watchAlertBtnText}>Envoyer une alerte test (telephone/montre)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.callDemoBtn} onPress={triggerInAppCallDemo}>
            <Ionicons name="call" size={16} color={COLORS.white} />
            <Text style={styles.callDemoBtnText}>Tester appel in-app</Text>
          </TouchableOpacity>

          {/* Today's medications */}
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          {medications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="medkit-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Aucun medicament enregistre</Text>
              <Text style={styles.emptyHint}>Ajoutez vos traitements ci-dessous</Text>
            </View>
          ) : (
            medications.map((med) => {
              const taken = med.taken[todayKey] || false;
              return (
                <TouchableOpacity
                  key={med.id}
                  style={styles.medCard}
                  onPress={() => toggleMedicationTaken(med.id, todayKey)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, taken && styles.checkboxDone]}>
                    {taken && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medName, taken && styles.medNameDone]}>{med.name}</Text>
                    <Text style={styles.medDosage}>{med.dosage}</Text>
                    <Text style={styles.simpleExplain}>{getSimpleMedicationExplanation(med.name)}</Text>
                    {med.schedule.length > 0 && (
                      <View style={styles.scheduleRow}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textLight} />
                        <Text style={styles.scheduleText}>{med.schedule.join(' - ')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: taken ? "#FF6B35" + '20' : COLORS.orange + '20' }]}>
                    <Text style={[styles.statusText, { color: taken ? "#FF6B35" : COLORS.orange }]}>
                      {taken ? 'Pris' : 'A prendre'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Add medication */}
          {!showAdd ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
              <Ionicons name="add-circle-outline" size={20} color={"#FF6B35"} />
              <Text style={styles.addBtnText}>Ajouter un medicament</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addCard}>
              <Text style={styles.addCardTitle}>Nouveau medicament</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom (ex: Metformine)"
                placeholderTextColor={COLORS.textLight}
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder="Dosage (ex: 500mg)"
                placeholderTextColor={COLORS.textLight}
                value={newDosage}
                onChangeText={setNewDosage}
              />
              <TextInput
                style={styles.input}
                placeholder="Horaires (ex: 08:00, 20:00)"
                placeholderTextColor={COLORS.textLight}
                value={newSchedule}
                onChangeText={setNewSchedule}
              />
              <View style={styles.addActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                  <Text style={styles.confirmBtnText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tip */}
          <View style={styles.tipCard}>
            <Ionicons name="notifications-outline" size={16} color={"#FF6B35"} />
            <Text style={styles.tipText}>
              Appuyez sur un medicament pour le marquer comme pris. L'avatar vous enverra des rappels.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FF6B35" },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.white + 'CC', marginTop: 4 },
  body: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  reminderTitle: { fontSize: 12, color: COLORS.white + 'CC', fontWeight: '700', textTransform: 'uppercase' },
  reminderText: { fontSize: 14, color: COLORS.white, marginTop: 2 },
  confirmOneTap: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  confirmOneTapText: { fontSize: 12, fontWeight: '700', color: "#FF6B35" },
  missedCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.danger + '12',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  missedText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },
  assistantCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assistantHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assistantTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  assistantHint: { fontSize: 12, color: COLORS.textLight, marginTop: 6, marginBottom: 10 },
  askBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
  },
  askBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  lastReply: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
    backgroundColor: '#FF6B3510',
    borderRadius: 10,
    padding: 10,
  },
  watchAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  watchAlertBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  callDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  callDemoBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8, marginBottom: 16 },
  emptyText: { fontSize: 14, color: COLORS.textLight },
  emptyHint: { fontSize: 12, color: COLORS.textLight },
  medCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  checkbox: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxDone: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  medName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  medNameDone: { textDecorationLine: 'line-through', color: COLORS.textLight },
  medDosage: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  simpleExplain: { fontSize: 11, color: COLORS.text, marginTop: 4, lineHeight: 16 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  scheduleText: { fontSize: 11, color: COLORS.textLight },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "#FF6B35", borderStyle: 'dashed', marginTop: 8,
  },
  addBtnText: { fontSize: 14, color: "#FF6B35", fontWeight: '500' },
  addCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, gap: 12, marginTop: 8 },
  addCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.text },
  addActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: COLORS.textLight },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#FF6B35", alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: "#FF6B35" + '10', borderRadius: 14, padding: 14, marginTop: 20,
  },
  tipText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 18 },
});

export default MedicationsScreen;
