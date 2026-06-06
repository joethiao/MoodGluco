import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import ttsService from '../services/ttsService';
import AnimatedAvatarImage from '../components/AnimatedAvatarImage';

const formatDuration = (seconds) => {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const MedicationCallScreen = ({ route, navigation }) => {
  const { setAvatarMessage, setAvatarExpanded } = useApp();
  const medicationName = route?.params?.medicationName || 'Votre traitement';
  const scheduledTime = route?.params?.scheduledTime || 'maintenant';
  const source = route?.params?.source || 'manual-demo';

  const [callState, setCallState] = useState('incoming');
  const [elapsed, setElapsed] = useState(0);

  const callTitle = useMemo(() => {
    if (callState === 'incoming') return 'APPEL ENTRANT';
    if (callState === 'connected') return 'EN COMMUNICATION';
    return 'APPEL TERMINE';
  }, [callState]);

  useEffect(() => {
    if (callState !== 'connected') return;
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [callState]);

  const handleAccept = () => {
    setCallState('connected');
    const voiceMessage = `Bonjour, ici Mes medicaments. Rappel: ${medicationName} a ${scheduledTime}.`;
    setAvatarMessage(voiceMessage);
    setAvatarExpanded(true);
    ttsService.speak(voiceMessage);
  };

  const handleEnd = () => {
    setCallState('ended');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#111827', '#0B1220']} style={styles.root}>
        <Text style={styles.badge}>{callTitle}</Text>

        <View style={styles.avatarCircle}>
          <AnimatedAvatarImage speaking={callState === 'connected'} size={128} />
        </View>

        <Text style={styles.contact}>Mes medicaments</Text>
        <Text style={styles.subline}>{medicationName} · {scheduledTime}</Text>
        <Text style={styles.meta}>Source: {source}</Text>

        {callState === 'connected' ? (
          <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
        ) : (
          <Text style={styles.timer}>00:00</Text>
        )}

        <View style={styles.actions}>
          {callState === 'incoming' ? (
            <>
              <TouchableOpacity style={[styles.actionBtn, styles.decline]} onPress={handleEnd}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.actionText}>Ignorer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.accept]} onPress={handleAccept}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <Text style={styles.actionText}>Repondre</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, styles.decline, styles.hangup]} onPress={handleEnd}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Raccrocher</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111827' },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '800',
    letterSpacing: 1,
  },
  avatarCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B35',
    marginTop: 18,
    marginBottom: 12,
  },
  contact: { fontSize: 30, color: '#FFFFFF', fontWeight: '800' },
  subline: { marginTop: 8, fontSize: 14, color: '#D1D5DB' },
  meta: { marginTop: 6, fontSize: 12, color: '#9CA3AF' },
  timer: { marginTop: 20, fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
  actions: {
    marginTop: 34,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 132,
  },
  decline: { backgroundColor: '#EF4444' },
  accept: { backgroundColor: '#10B981' },
  hangup: { minWidth: 180 },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

export default MedicationCallScreen;
