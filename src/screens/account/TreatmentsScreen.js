import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccountSubScreen, { accountStyles } from './AccountSubScreen';
import { useApp } from '../../context/AppContext';

const INDIGO = '#4F6BED';
const ALL_TREATMENTS = [
  'Metformine',
  'Insuline rapide',
  'Insuline lente',
  'Sulfamides',
  'Inhibiteurs DPP-4',
  'Regime seul',
  'Activite physique',
  'Autre',
];

export default function TreatmentsScreen({ navigation }) {
  const { userProfile, setUserProfile } = useApp();
  const [selected, setSelected] = useState(userProfile?.treatments || []);

  const toggle = (t) => setSelected(c =>
    c.includes(t) ? c.filter(x => x !== t) : [...c, t]
  );

  const save = () => {
    setUserProfile({ ...userProfile, treatments: selected });
    navigation.goBack();
  };

  return (
    <AccountSubScreen navigation={navigation} title="My Treatments">
      <View style={accountStyles.card}>
        <Text style={accountStyles.helpText}>
          Selectionnez les traitements actuellement actifs. Cette information aide votre avatar a personnaliser ses conseils.
        </Text>
      </View>

      <Text style={accountStyles.sectionLabel}>Traitements disponibles</Text>
      <View style={localStyles.tagList}>
        {ALL_TREATMENTS.map((t) => {
          const active = selected.includes(t);
          return (
            <TouchableOpacity
              key={t}
              style={[localStyles.tag, active && localStyles.tagActive]}
              activeOpacity={0.85}
              onPress={() => toggle(t)}
            >
              {active && <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />}
              <Text style={[localStyles.tagText, active && localStyles.tagTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={accountStyles.primaryBtn} activeOpacity={0.85} onPress={save}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
        <Text style={accountStyles.primaryBtnText}>Enregistrer ({selected.length})</Text>
      </TouchableOpacity>
    </AccountSubScreen>
  );
}

const localStyles = StyleSheet.create({
  tagList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, borderWidth: 1, borderColor: '#E6EBF2',
    backgroundColor: '#FFFFFF', marginRight: 8, marginBottom: 8,
  },
  tagActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  tagText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  tagTextActive: { color: '#FFFFFF' },
});
