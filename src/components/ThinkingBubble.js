import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const DOT_SIZE = 11;
const STAGGER = 180;
const BUBBLE_COLOR = '#FFFFFF';
const BORDER_COLOR = '#D1D5DB';

export default function ThinkingBubble() {
  const a0 = useRef(new Animated.Value(0)).current;
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const anims = [a0, a1, a2];

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * STAGGER),
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((anims.length - 1 - i) * STAGGER),
        ])
      )
    );
    const composite = Animated.parallel(loops);
    composite.start();
    return () => {
      composite.stop();
      // don't call setValue here — causes the "no listeners" warning with native driver
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrapper}>
      {/* Cloud shape: main oval with bumps in normal flow above */}
      <View style={styles.bumpsRow}>
        <View style={[styles.bump, styles.bumpSm]} />
        <View style={[styles.bump, styles.bumpLg]} />
        <View style={[styles.bump, styles.bumpSm]} />
      </View>
      <View style={styles.cloudBody}>
        {anims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                transform: [{
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -9],
                  }),
                }],
              },
            ]}
          />
        ))}
      </View>

      {/* Thought trail — 3 decreasing circles */}
      <View style={styles.trailRow}>
        <View style={[styles.trailCircle, { width: 9, height: 9 }]} />
        <View style={[styles.trailCircle, { width: 6, height: 6 }]} />
        <View style={[styles.trailCircle, { width: 4, height: 4 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },

  // bumps sit above the body in normal flow
  bumpsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: -6, // overlap slightly onto body
    paddingHorizontal: 14,
    gap: 6,
    zIndex: 2,
  },
  bump: {
    backgroundColor: BUBBLE_COLOR,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderBottomWidth: 0, // hide bottom border so it blends into body
  },
  bumpSm: { width: 26, height: 26 },
  bumpLg: { width: 36, height: 36 },

  cloudBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BUBBLE_COLOR,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 22,
    paddingVertical: 14,
    gap: 9,
    justifyContent: 'center',
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 1,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#9CA3AF',
  },

  // trail below cloud
  trailRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  trailCircle: {
    borderRadius: 999,
    backgroundColor: BUBBLE_COLOR,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});


const DOT_SIZE = 10;
const BOUNCE_HEIGHT = -8;
const STAGGER = 160;
const BUBBLE_COLOR = '#F1F5F9';

export default function ThinkingBubble() {
  // Bouncing dots inside the cloud
  const a0 = useRef(new Animated.Value(0)).current;
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const dots = [a0, a1, a2];

  useEffect(() => {
    const animations = dots.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * STAGGER),
          Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay((dots.length - 1 - i) * STAGGER),
        ])
      )
    );
    const parallel = Animated.parallel(animations);
    parallel.start();
    return () => {
      parallel.stop();
      dots.forEach((anim) => { anim.stopAnimation(); anim.setValue(0); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrapper}>
      {/* Cloud bubble — built from overlapping ovals */}
      <View style={styles.cloud}>
        {/* bumps on top */}
        <View style={[styles.bump, styles.bumpLeft]} />
        <View style={[styles.bump, styles.bumpCenter]} />
        <View style={[styles.bump, styles.bumpRight]} />
        {/* main body */}
        <View style={styles.cloudBody}>
          {dots.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  transform: [{
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, BOUNCE_HEIGHT],
                    }),
                  }],
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Thought trail — three small circles pointing down toward the avatar */}
      <View style={styles.trail}>
        <View style={[styles.trailDot, { width: 8, height: 8 }]} />
        <View style={[styles.trailDot, { width: 5, height: 5 }]} />
        <View style={[styles.trailDot, { width: 3, height: 3 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 4,
  },

  // ── Cloud ──────────────────────────────────────────────────────────────────
  cloud: {
    width: 120,
    alignItems: 'center',
    position: 'relative',
  },
  bump: {
    position: 'absolute',
    backgroundColor: BUBBLE_COLOR,
    borderRadius: 999,
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -1 },
    elevation: 2,
  },
  bumpLeft: {
    width: 38,
    height: 38,
    top: -16,
    left: 10,
  },
  bumpCenter: {
    width: 50,
    height: 50,
    top: -24,
    left: 35,
  },
  bumpRight: {
    width: 38,
    height: 38,
    top: -16,
    right: 10,
  },
  cloudBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BUBBLE_COLOR,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 1,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#94A3B8',
  },

  // ── Thought trail ─────────────────────────────────────────────────────────
  trail: {
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  trailDot: {
    borderRadius: 999,
    backgroundColor: BUBBLE_COLOR,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
              styles.dot,
              {
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, BOUNCE_HEIGHT],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: 6,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 8,
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tail: {
    // triangle pointing down toward avatar
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F1F5F9',
    alignSelf: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#94A3B8',
  },
});
