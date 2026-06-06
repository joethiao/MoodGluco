import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccountSubScreen, { accountStyles } from './AccountSubScreen';

const FAQ = [
  {
    q: "Comment l'avatar adapte-t-il ses reponses ?",
    a: "L'avatar utilise un modele d'IA local (Ollama) et une analyse faciale optionnelle pour adapter son ton et ses suggestions a votre etat du moment.",
  },
  {
    q: 'Mes donnees sont-elles partagees ?',
    a: "Non. Toutes les donnees restent stockees localement sur votre appareil. Aucune connexion serveur n'est requise pour le fonctionnement de base.",
  },
  {
    q: 'Comment changer la voix de mon avatar ?',
    a: "Dans Parametres Avatar, vous pouvez choisir entre 5 moteurs de voix (natif, Edge TTS, Kokoro, Piper, XTTS) et selectionner masculin ou feminin.",
  },
  {
    q: "L'app remplace-t-elle un suivi medical ?",
    a: "Non. MoodGluco est un outil d'accompagnement. Tous les ajustements de traitement doivent etre valides par votre medecin.",
  },
];

export default function SupportScreen({ navigation }) {
  const [open, setOpen] = useState(null);

  return (
    <AccountSubScreen navigation={navigation} title="Support & Help">
      <Text style={accountStyles.sectionLabel}>Nous contacter</Text>
      <View style={accountStyles.card}>
        <ContactRow
          icon="mail-outline"
          title="Email"
          subtitle="support@moodgluco.app"
          onPress={() => Linking.openURL('mailto:support@moodgluco.app')}
        />
        <View style={localStyles.divider} />
        <ContactRow
          icon="call-outline"
          title="Telephone"
          subtitle="01 23 45 67 89 (9h-18h)"
          onPress={() => Linking.openURL('tel:0123456789')}
        />
        <View style={localStyles.divider} />
        <ContactRow
          icon="chatbubbles-outline"
          title="Chat en direct"
          subtitle="Reponse en moins de 5 minutes"
          onPress={() => {}}
        />
      </View>

      <Text style={accountStyles.sectionLabel}>Questions frequentes</Text>
      {FAQ.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={[localStyles.faqCard, open === i && localStyles.faqCardOpen]}
          activeOpacity={0.85}
          onPress={() => setOpen(open === i ? null : i)}
        >
          <View style={localStyles.faqHeader}>
            <Text style={localStyles.faqQ}>{item.q}</Text>
            <Ionicons
              name={open === i ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#6B7280"
            />
          </View>
          {open === i && <Text style={localStyles.faqA}>{item.a}</Text>}
        </TouchableOpacity>
      ))}
    </AccountSubScreen>
  );
}

function ContactRow({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={localStyles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={localStyles.iconBox}>
        <Ionicons name={icon} size={18} color="#4F6BED" />
      </View>
      <View style={localStyles.text}>
        <Text style={localStyles.title}>{title}</Text>
        <Text style={localStyles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const localStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8EEFE',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F2F5' },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E6EBF2',
  },
  faqCardOpen: { borderColor: '#4F6BED' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { flex: 1, fontSize: 13.5, fontWeight: '700', color: '#111827', paddingRight: 10 },
  faqA: { marginTop: 10, fontSize: 13, color: '#4B5563', lineHeight: 19 },
});
