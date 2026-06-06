import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccountSubScreen, { accountStyles } from './AccountSubScreen';

const INDIGO = '#4F6BED';

export default function SecurityScreen({ navigation }) {
  const [current, setCurrent]   = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [confirm, setConfirm]   = useState('');
  const [twoFA, setTwoFA]       = useState(false);
  const [biometric, setBiometric] = useState(true);

  const changePassword = () => {
    if (!current || !newPwd) { Alert.alert('Erreur', 'Tous les champs sont requis.'); return; }
    if (newPwd !== confirm)  { Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.'); return; }
    if (newPwd.length < 8)   { Alert.alert('Erreur', 'Minimum 8 caracteres.'); return; }
    Alert.alert('Mot de passe', 'Mot de passe mis a jour.');
    setCurrent(''); setNewPwd(''); setConfirm('');
  };

  return (
    <AccountSubScreen navigation={navigation} title="Security & Password">
      <Text style={accountStyles.sectionLabel}>Changer le mot de passe</Text>
      <View style={accountStyles.card}>
        <Text style={accountStyles.inputLabel}>Mot de passe actuel</Text>
        <TextInput
          style={accountStyles.input}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={accountStyles.inputLabel}>Nouveau mot de passe</Text>
        <TextInput
          style={accountStyles.input}
          value={newPwd}
          onChangeText={setNewPwd}
          secureTextEntry
          placeholder="Au moins 8 caracteres"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={accountStyles.inputLabel}>Confirmer</Text>
        <TextInput
          style={accountStyles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Repetez le mot de passe"
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity style={accountStyles.primaryBtn} activeOpacity={0.85} onPress={changePassword}>
          <Ionicons name="key-outline" size={18} color="#FFFFFF" />
          <Text style={accountStyles.primaryBtnText}>Mettre a jour</Text>
        </TouchableOpacity>
      </View>

      <Text style={accountStyles.sectionLabel}>Authentification</Text>
      <View style={accountStyles.card}>
        <View style={localStyles.row}>
          <View style={localStyles.iconBox}>
            <Ionicons name="finger-print-outline" size={18} color="#4F6BED" />
          </View>
          <View style={localStyles.text}>
            <Text style={localStyles.title}>Biometrie</Text>
            <Text style={localStyles.subtitle}>Face ID / Touch ID pour ouvrir l'app</Text>
          </View>
          <Switch
            value={biometric}
            onValueChange={setBiometric}
            trackColor={{ false: '#D1D5DB', true: INDIGO + '60' }}
            thumbColor={biometric ? INDIGO : '#FFFFFF'}
          />
        </View>
        <View style={localStyles.divider} />
        <View style={localStyles.row}>
          <View style={localStyles.iconBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#4F6BED" />
          </View>
          <View style={localStyles.text}>
            <Text style={localStyles.title}>Authentification a 2 facteurs</Text>
            <Text style={localStyles.subtitle}>Code SMS a chaque connexion</Text>
          </View>
          <Switch
            value={twoFA}
            onValueChange={setTwoFA}
            trackColor={{ false: '#D1D5DB', true: INDIGO + '60' }}
            thumbColor={twoFA ? INDIGO : '#FFFFFF'}
          />
        </View>
      </View>
    </AccountSubScreen>
  );
}

const localStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  iconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8EEFE',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 4 },
});
