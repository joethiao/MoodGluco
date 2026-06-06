import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AccountSubScreen, { accountStyles } from './AccountSubScreen';

export default function PaymentMethodsScreen({ navigation }) {
  return (
    <AccountSubScreen navigation={navigation} title="Payment Methods">
      <View style={accountStyles.card}>
        <View style={accountStyles.emptyIcon}>
          <Ionicons name="card-outline" size={32} color="#4F6BED" />
        </View>
        <Text style={accountStyles.emptyTitle}>Aucun moyen de paiement</Text>
        <Text style={accountStyles.emptyDesc}>
          Ajoutez une carte ou un mode de paiement pour acceder aux services premium MoodGluco.
        </Text>
      </View>

      <TouchableOpacity style={accountStyles.primaryBtn} activeOpacity={0.85} onPress={() => {}}>
        <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
        <Text style={accountStyles.primaryBtnText}>Ajouter une carte</Text>
      </TouchableOpacity>
    </AccountSubScreen>
  );
}
