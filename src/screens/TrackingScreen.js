import React, { useMemo } from 'react';
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
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../context/AppContext';

const ORANGE       = '#FF6B35';
const ORANGE_SOFT  = '#FF8C5A';   // header transparent overlay
const PEACH_BG     = '#FFF4ED';   // page background under cards
const TEXT_DARK    = '#1A1A2E';
const MUTED        = '#9094A0';
const DOT_ORANGE   = '#FF6B35';
const DOT_PEACH    = '#FFCBB0';

export default function TrackingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userProfile, medications, glucose } = useApp();

  const firstName = (userProfile?.name || 'friend').split(' ')[0];
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  // ── Stats ────────────────────────────────────────────────────────
  const todayISO   = new Date().toISOString().split('T')[0];

  const medStats = useMemo(() => {
    const total = medications?.length || 0;
    const taken = (medications || []).filter((m) => !!m.taken?.[todayISO]).length;
    return {
      total,
      taken,
      pct: total ? Math.round((taken / total) * 100) : 0,
    };
  }, [medications, todayISO]);

  const reportStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayValues = (glucose || [])
      .filter((g) => new Date(g.timestamp).toDateString() === today)
      .map((g) => g.value)
      .filter((v) => Number.isFinite(v));

    const total = todayValues.length;
    const inRange = todayValues.filter((v) => v >= 70 && v <= 180).length;
    return {
      total,
      inRange,
      pct: total ? Math.round((inRange / total) * 100) : 0,
    };
  }, [glucose]);

  const cards = [
    {
      streak: `${medStats.taken} taken today`,
      title:  'My medications\ntoday',
      sub:    medStats.total
        ? `${medStats.taken}/${medStats.total} medications confirmed`
        : 'No medications registered',
      pct:    medStats.pct,
      screen: 'Medications',
    },
    {
      streak: reportStats.total
        ? `${reportStats.inRange}/${reportStats.total} in range today`
        : 'No data today',
      title:  'My Health Report',
      sub:    reportStats.total
        ? 'Trends · physician summary · export'
        : 'Add a glucose measurement to generate your report',
      pct:    reportStats.pct,
      screen: 'GlucoseBilan',
    },
  ];

  return (
    <LinearGradient
      colors={[ORANGE, '#FFB088', '#FFE0CC', PEACH_BG]}
      locations={[0, 0.35, 0.65, 1]}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} translucent={false} />

      {/* ── Orange header ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.avatar}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ProfileTab')}
          >
            <Ionicons name="person" size={20} color={ORANGE} />
          </TouchableOpacity>
          <View style={styles.topRight}>
            <TouchableOpacity style={styles.topIconBubble} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topIconBubble} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <View style={styles.menuLine} />
                <View style={[styles.menuLine, { width: 12 }]} />
                <View style={styles.menuLine} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.greeting}>{greeting}, {firstName}.</Text>
        <Text style={styles.headline}>
          Keep the momentum,{"\n"}track your health every day.
        </Text>
      </View>

      {/* ── Card list ─────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {cards.map((card, i) => (
          <TouchableOpacity
            key={i}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate(card.screen)}
          >
            <View style={styles.cardLeft}>
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={13} color={ORANGE} />
                <Text style={styles.streakText}>{card.streak}</Text>
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSub}>{card.sub}</Text>
            </View>
            <ScatterDots pct={card.pct} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

// ── Circular dotted progress (percentage at center) ───────────────────
function ScatterDots({ pct }) {
  const SIZE       = 80;
  const CENTER     = SIZE / 2;
  const RADIUS     = 30;
  const TOTAL_DOTS = 32;
  const filled     = Math.round((pct / 100) * TOTAL_DOTS);

  const dots = [];
  for (let i = 0; i < TOTAL_DOTS; i++) {
    const angle = (i / TOTAL_DOTS) * 2 * Math.PI - Math.PI / 2;
    const x = CENTER + RADIUS * Math.cos(angle);
    const y = CENTER + RADIUS * Math.sin(angle);
    const isOn = i < filled;
    dots.push(
      <Circle
        key={i}
        cx={x}
        cy={y}
        r={isOn ? 2.4 : 1.8}
        fill={isOn ? DOT_ORANGE : DOT_PEACH}
      />
    );
  }

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE}>{dots}</Svg>
      <Text style={{ position: 'absolute', fontSize: 14, fontWeight: '800', color: TEXT_DARK }}>
        {pct}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Header ─────────────────────────────────
  header: {
    paddingHorizontal: 22,
    paddingBottom: 30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  topRight: { flexDirection: 'row', gap: 10 },
  topIconBubble: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIcon: {
    alignItems: 'flex-end',
    gap: 3,
  },
  menuLine: {
    height: 1.8,
    width: 16,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    marginTop: 28,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  headline: {
    marginTop: 6,
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    letterSpacing: -0.3,
  },

  // ── Cards ──────────────────────────────────
  scroll: { backgroundColor: 'transparent' },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 30,
    paddingHorizontal: 26,
    marginBottom: 20,
    minHeight: 168,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardLeft: { flex: 1, paddingRight: 12 },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: ORANGE,
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: TEXT_DARK,
    lineHeight: 30,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  cardSub: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '500',
    lineHeight: 20,
  },
});
