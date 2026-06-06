import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const INDIGO       = '#4F6BED';
const INDIGO_SOFT  = '#7C8FF0';
const BLUE_BG     = '#F2F5FF';
const BLUE_LIGHT        = '#E8EEFE';
const TEXT_DARK    = '#1A1A2E';
const MUTED        = '#9094A0';

/**
 * Shared layout for all account sub-screens (matches Tracking / Profile mood).
 */
export default function AccountSubScreen({ navigation, title, children, rightAction }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[INDIGO, '#8FA1F2', '#D0DAFB', BLUE_BG]}
      locations={[0, 0.30, 0.55, 1]}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} translucent={false} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.iconBubble}
          activeOpacity={0.7}
          onPress={() => navigation?.canGoBack?.() && navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.rightSlot}>
          {rightAction || <View style={styles.iconBubble} />}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBubble: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: INDIGO_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  rightSlot: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
});

// Shared styles for sub-screens — orange/peach mood
export const accountStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#4F6BED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 8,
    marginLeft: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: MUTED,
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: BLUE_BG,
    borderWidth: 1,
    borderColor: BLUE_LIGHT,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14.5,
    color: TEXT_DARK,
    fontWeight: '500',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F8',
    color: MUTED,
    borderColor: '#EEEEEE',
  },
  primaryBtn: {
    backgroundColor: INDIGO,
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    shadowColor: INDIGO,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  helpText: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 19,
    fontWeight: '500',
  },
  emptyIcon: {
    alignSelf: 'center',
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: BLUE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_DARK,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  emptyDesc: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    lineHeight: 19,
    fontWeight: '500',
  },
});
