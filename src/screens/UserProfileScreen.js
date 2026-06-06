import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';

const INDIGO       = '#4F6BED';
const INDIGO_SOFT  = '#7C8FF0';
const BLUE_BG      = '#F2F5FF';
const BLUE_LIGHT   = '#E8EEFE';
const TEXT_DARK    = '#1A1A2E';
const MUTED        = '#9094A0';
const ICON_BG      = '#E8EEFE';
const RED          = '#E63946';

export default function UserProfileScreen({ navigation }) {
  const {
    userProfile,
    setUserProfile,
    setOnboardingComplete,
    medications,
  } = useApp();
  const insets = useSafeAreaInsets();

  const displayName = userProfile?.name?.trim() || 'Alex Dubois';
  const initials = useMemo(
    () => displayName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
    [displayName]
  );

  const email = useMemo(() => {
    if (userProfile?.email) return userProfile.email;
    const norm = displayName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    return norm ? `${norm}@moodgluco.app` : 'profil@moodgluco.app';
  }, [displayName, userProfile?.email]);

  const recentLabel = useMemo(() => {
    if (medications?.length) return `${medications.length} traitements actifs`;
    if (userProfile?.treatments?.length) return `${userProfile.treatments.length} traitements`;
    return 'Profil incomplet';
  }, [medications, userProfile?.treatments]);

  const treatBadge  = userProfile?.treatments?.length || null;
  const medBadge    = medications?.length || null;
  const doctorBadge = userProfile?.doctorName ? '1' : null;

  const handleLogout = () => {
    Alert.alert('Se deconnecter',
      'Cette action efface les donnees locales et relance l onboarding. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se deconnecter', style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('moodgluco_data');
            setUserProfile(null);
            setOnboardingComplete(false);
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={[INDIGO, '#8FA1F2', '#D0DAFB', BLUE_BG]}
      locations={[0, 0.35, 0.65, 1]}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} translucent={false} />

      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.topIconBubble}
            activeOpacity={0.7}
            onPress={() => navigation?.canGoBack?.() && navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon Compte</Text>
          <TouchableOpacity
            style={styles.topIconBubble}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AccountInfo')}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Avatar + identity */}
        <View style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            </View>
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>

          <View style={styles.activityPill}>
            <Ionicons name="flame" size={13} color={INDIGO} />
            <Text style={styles.activityText}>{recentLabel}</Text>
          </View>
        </View>
      </View>

      {/* ── Menu list ─────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        <MenuRow icon="person-outline"            title="Account Info"        subtitle="Edit personal details"      onPress={() => navigation.navigate('AccountInfo')} />
        <MenuRow icon="medkit-outline"            title="My Treatments"       subtitle="Manage active medications"  badge={medBadge ? String(medBadge) : null} onPress={() => navigation.navigate('Treatments')} />
        <MenuRow icon="card-outline"              title="Payment Methods"     subtitle="Manage cards & billing"     onPress={() => navigation.navigate('PaymentMethods')} />
        <MenuRow icon="location-outline"          title="Doctor & Contacts"   subtitle="Saved medical contacts"     badge={doctorBadge} onPress={() => navigation.navigate('DoctorContacts')} />
        <MenuRow icon="color-palette-outline"     title="My Avatar"           subtitle="Skin tone & outfit"         badge={treatBadge ? String(treatBadge) : null} onPress={() => navigation.navigate('AvatarProfile')} />
        <MenuRow icon="settings-outline"          title="Settings"            subtitle="App preferences, theme"     onPress={() => navigation.navigate('Settings')} />
        <MenuRow icon="notifications-outline"     title="Notifications"       subtitle="Manage alerts & reminders"  onPress={() => navigation.navigate('NotificationsSettings')} />
        <MenuRow icon="lock-closed-outline"       title="Security & Password" subtitle="Change password, 2FA"       onPress={() => navigation.navigate('Security')} />
        <MenuRow icon="help-circle-outline"       title="Support & Help"      subtitle="FAQs, contact support"      onPress={() => navigation.navigate('Support')} />

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={19} color={RED} />
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

function MenuRow({ icon, title, subtitle, badge, onPress }) {
  return (
    <TouchableOpacity style={styles.menuRow} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.menuIconBox}>
        <Ionicons name={icon} size={20} color={INDIGO} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      {badge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color="#C9CCD3" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Header ─────────────────────────────────
  header: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
  },
  topIconBubble: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: INDIGO_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // ── Profile block ──────────────────────────
  profileBlock: {
    alignItems: 'center',
    marginTop: 18,
  },
  avatarWrap: { position: 'relative' },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  avatarInner: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '800',
    color: INDIGO,
    letterSpacing: -0.5,
  },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22C55E',
    borderWidth: 3, borderColor: '#FFFFFF',
  },
  profileName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  profileEmail: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
  },
  activityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  activityText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: INDIGO,
    letterSpacing: 0.1,
  },

  // ── Menu list ──────────────────────────────
  scroll: { backgroundColor: 'transparent' },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 26,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#4F6BED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  menuIconBox: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  menuTextWrap: { flex: 1, paddingRight: 8 },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    letterSpacing: -0.2,
  },
  menuSubtitle: {
    marginTop: 3,
    fontSize: 12.5,
    color: MUTED,
    fontWeight: '500',
  },
  menuBadge: {
    marginRight: 8,
    minWidth: 24, height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: INDIGO,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Logout ─────────────────────────────────
  logoutButton: {
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: RED,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: RED,
    letterSpacing: 0.5,
  },
});
