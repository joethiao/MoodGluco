import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';

const STEPS = [
  { key: 'welcome' },
  { key: 'name' },
  { key: 'age' },
  { key: 'treatment' },
  { key: 'contact' },
  { key: 'doctor' },
];

const TREATMENTS = ['Metformine', 'Insuline rapide', 'Insuline lente', 'Regime seul', 'Autre'];

const OnboardingScreen = ({ navigation }) => {
  const { setUserProfile, setOnboardingComplete } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [treatments, setTreatments] = useState([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [doctorFullName, setDoctorFullName] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [treatmentDetails, setTreatmentDetails] = useState({});

  const toggleTreatment = (t) => {
    setTreatments((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const setTreatmentDetail = (t, text) => {
    setTreatmentDetails((prev) => ({ ...prev, [t]: text }));
  };

  const handleFinish = () => {
    setUserProfile({
      name: name || 'Utilisateur',
      age: Number(age) || undefined,
      diabetesType: 'type2',
      treatments,
      treatmentDetails,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      doctorFullName: doctorFullName || undefined,
      doctorAddress: doctorAddress || undefined,
      doctorPhone: doctorPhone || undefined,
    });
    setOnboardingComplete(true);
  };

  const canNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return age.trim().length > 0 && Number(age) > 0;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.centerContent}>
            <Image
              source={require('../../female_avatar.png')}
              style={styles.femaleAvatarBigImg}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Bonjour !</Text>
            <Text style={styles.welcomeText}>
              Si vous êtes ici, c'est que vous êtes atteint(e) du diabète de type 2, ou que vous accompagnez un proche.
            </Text>
            <Text style={[styles.welcomeText, { marginTop: 12 }]}>
              Je suis votre compagnon personnel : je vous accompagne, vous conseille et vous motive au quotidien.
            </Text>
          </View>
        );
      case 1:
        return (
          <View style={styles.inputSection}>
            <Image source={require('../../female_avatar.png')} style={styles.femaleAvatarSmallImg} resizeMode="contain" />
            <Text style={styles.bubbleText}>Comment puis-je vous appeler ?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Votre prenom"
              placeholderTextColor={COLORS.textLight}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.inputSection}>
            <Image source={require('../../female_avatar.png')} style={styles.femaleAvatarSmallImg} resizeMode="contain" />
            <Text style={styles.bubbleText}>Quel est votre age ?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: 65"
              placeholderTextColor={COLORS.textLight}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              autoFocus
              maxLength={3}
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.inputSection}>
            <Image source={require('../../female_avatar.png')} style={styles.femaleAvatarSmallImg} resizeMode="contain" />
            <Text style={styles.bubbleText}>Quels traitements suivez-vous ?</Text>
            <View style={styles.chipContainer}>
              {TREATMENTS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, treatments.includes(t) && styles.chipActive]}
                  onPress={() => toggleTreatment(t)}
                >
                  <Text style={[styles.chipText, treatments.includes(t) && styles.chipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {treatments.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Précisez la posologie (optionnel)</Text>
                {treatments.map((t) => (
                  <View key={t} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t}</Text>
                    <TextInput
                      style={styles.detailInput}
                      placeholder="Ex: 500mg matin et soir"
                      placeholderTextColor={COLORS.textLight}
                      value={treatmentDetails[t] || ''}
                      onChangeText={(text) => setTreatmentDetail(t, text)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      case 4:
        return (
          <View style={styles.inputSection}>
            <Image source={require('../../female_avatar.png')} style={styles.femaleAvatarSmallImg} resizeMode="contain" />
            <Text style={styles.bubbleText}>Un proche de confiance ?</Text>
            <Text style={styles.hintText}>Optionnel — quelqu'un à prévenir si nécessaire.</Text>
            <TextInput
              style={[styles.textInput, { marginBottom: 12 }]}
              placeholder="Prénom et nom"
              placeholderTextColor={COLORS.textLight}
              value={contactName}
              onChangeText={setContactName}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Téléphone (ex: 078 123 45 67)"
              placeholderTextColor={COLORS.textLight}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
            />
            <Text style={styles.skipText}>Vous pouvez passer cette étape</Text>
          </View>
        );
      case 5:
        return (
          <View style={styles.inputSection}>
            <Image source={require('../../female_avatar.png')} style={styles.femaleAvatarSmallImg} resizeMode="contain" />
            <Text style={styles.bubbleText}>Les coordonnées de votre médecin ?</Text>
            <TextInput
              style={[styles.textInput, { marginBottom: 12 }]}
              placeholder="Dr. Nom Prénom"
              placeholderTextColor={COLORS.textLight}
              value={doctorFullName}
              onChangeText={setDoctorFullName}
            />
            <TextInput
              style={[styles.textInput, { marginBottom: 12 }]}
              placeholder="Adresse du cabinet (optionnel)"
              placeholderTextColor={COLORS.textLight}
              value={doctorAddress}
              onChangeText={setDoctorAddress}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Téléphone du cabinet (optionnel)"
              placeholderTextColor={COLORS.textLight}
              value={doctorPhone}
              onChangeText={setDoctorPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.privacyBox}>
              <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
              <Text style={styles.privacyText}>
                Ces informations restent uniquement sur votre appareil. Aucun lien n'existe entre cette app et votre médecin. C'est juste un raccourci pour vous faciliter le contact.
              </Text>
            </View>
            <Text style={styles.skipText}>Vous pouvez passer cette étape</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MoodGluco</Text>
        <Text style={styles.headerStep}>{step + 1} / {STEPS.length}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
            onPress={() => canNext() && setStep(step + 1)}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={handleFinish}>
            <Text style={styles.nextBtnText}>Commencer</Text>
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  headerStep: { fontSize: 13, color: COLORS.textLight },
  progressBar: { height: 3, backgroundColor: COLORS.muted, marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: COLORS.primary, borderRadius: 2 },
  content: { flex: 1 },
  contentInner: { padding: 24, paddingBottom: 40 },
  centerContent: { alignItems: 'center', paddingTop: 40 },
  femaleAvatarBig: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  femaleAvatarBigImg: {
    width: 160, height: 160, marginBottom: 24,
  },
  welcomeTitle: { fontSize: 34, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  welcomeText: { fontSize: 18, color: COLORS.textLight, textAlign: 'center', lineHeight: 27, paddingHorizontal: 12 },
  demoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 32, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary,
  },
  demoBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  inputSection: { paddingTop: 20 },
  femaleAvatarSmall: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  femaleAvatarSmallImg: {
    width: 90, height: 90, marginBottom: 16,
  },
  bubbleText: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  hintText: { fontSize: 13, color: COLORS.textLight, marginBottom: 16, lineHeight: 18 },
  textInput: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
    fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  privacyBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.primary + '12', borderRadius: 12,
    padding: 12, marginTop: 16,
  },
  privacyText: { flex: 1, fontSize: 12, color: COLORS.textLight, lineHeight: 18 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, color: COLORS.text },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
  skipText: { fontSize: 12, color: COLORS.textLight, marginTop: 12, textAlign: 'center' },
  detailsSection: {
    width: '100%', marginTop: 16, backgroundColor: COLORS.primary + '08',
    borderRadius: 14, padding: 14, gap: 12,
  },
  detailsSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  detailRow: { gap: 6 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  detailInput: {
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { fontSize: 14, color: COLORS.primary },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
});

export default OnboardingScreen;
