import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccountSubScreen, { accountStyles } from './AccountSubScreen';
import { useApp } from '../../context/AppContext';

export default function AccountInfoScreen({ navigation }) {
  const { userProfile, setUserProfile } = useApp();
  const [name, setName] = useState(userProfile?.name || '');
  const [age, setAge]   = useState(String(userProfile?.age || ''));

  const email = useMemo(() => {
    if (userProfile?.email) return userProfile.email;
    const norm = (name || 'profil').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    return `${norm || 'profil'}@moodgluco.app`;
  }, [name, userProfile?.email]);

  const save = () => {
    if (!name.trim()) { Alert.alert('Erreur', 'Le prenom est requis.'); return; }
    setUserProfile({ ...userProfile, name: name.trim(), age: Number(age) || undefined });
    Alert.alert('Sauvegarde', 'Vos informations ont ete mises a jour.');
    navigation.goBack();
  };

  return (
    <AccountSubScreen navigation={navigation} title="Account Info">
      <View style={accountStyles.card}>
        <Text style={accountStyles.inputLabel}>Nom complet</Text>
        <TextInput
          style={accountStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="Votre nom"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={accountStyles.inputLabel}>Age</Text>
        <TextInput
          style={accountStyles.input}
          value={age}
          onChangeText={setAge}
          placeholder="Ex: 68"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <Text style={accountStyles.inputLabel}>Email</Text>
        <TextInput
          style={[accountStyles.input, accountStyles.inputDisabled]}
          value={email}
          editable={false}
        />
      </View>

      <TouchableOpacity style={accountStyles.primaryBtn} activeOpacity={0.85} onPress={save}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
        <Text style={accountStyles.primaryBtnText}>Enregistrer</Text>
      </TouchableOpacity>
    </AccountSubScreen>
  );
}
