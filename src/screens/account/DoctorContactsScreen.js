import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccountSubScreen, { accountStyles } from './AccountSubScreen';
import { useApp } from '../../context/AppContext';

export default function DoctorContactsScreen({ navigation }) {
  const { userProfile, setUserProfile } = useApp();
  const [doctorName, setDoctorName] = useState(userProfile?.doctorName || '');
  const [doctorPhone, setDoctorPhone] = useState(userProfile?.doctorPhone || '');
  const [pharmacyName, setPharmacyName] = useState(userProfile?.pharmacyName || '');

  const save = () => {
    setUserProfile({
      ...userProfile,
      doctorName: doctorName.trim(),
      doctorPhone: doctorPhone.trim(),
      pharmacyName: pharmacyName.trim(),
    });
    navigation.goBack();
  };

  return (
    <AccountSubScreen navigation={navigation} title="Doctor & Contacts">
      <View style={accountStyles.card}>
        <Text style={accountStyles.sectionLabel}>Medecin referent</Text>
        <Text style={accountStyles.inputLabel}>Nom</Text>
        <TextInput
          style={accountStyles.input}
          value={doctorName}
          onChangeText={setDoctorName}
          placeholder="Dr Dupont"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={accountStyles.inputLabel}>Telephone</Text>
        <TextInput
          style={accountStyles.input}
          value={doctorPhone}
          onChangeText={setDoctorPhone}
          placeholder="01 23 45 67 89"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />
      </View>

      <View style={accountStyles.card}>
        <Text style={accountStyles.sectionLabel}>Pharmacie</Text>
        <Text style={accountStyles.inputLabel}>Nom de la pharmacie</Text>
        <TextInput
          style={accountStyles.input}
          value={pharmacyName}
          onChangeText={setPharmacyName}
          placeholder="Pharmacie de la Republique"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <TouchableOpacity style={accountStyles.primaryBtn} activeOpacity={0.85} onPress={save}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
        <Text style={accountStyles.primaryBtnText}>Enregistrer</Text>
      </TouchableOpacity>
    </AccountSubScreen>
  );
}
