import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const LivingAvatarStage = ({ speaking, mood = 'calm', onPress, skinColor, shirtColor }) => {
  const bob = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const mouth = useRef(new Animated.Value(2)).current;
  const aura = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -8, duration: 1600, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );

    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2400),
        Animated.timing(blink, { toValue: 0.15, duration: 80, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
      ])
    );

    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(aura, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(aura, { toValue: 0.65, duration: 1800, useNativeDriver: true }),
      ])
    );

    bobLoop.start();
    blinkLoop.start();
    auraLoop.start();

    return () => {
      bobLoop.stop();
      blinkLoop.stop();
      auraLoop.stop();
    };
  }, [aura, blink, bob]);

  useEffect(() => {
    if (!speaking) {
      Animated.timing(mouth, { toValue: 2, duration: 120, useNativeDriver: false }).start();
      return;
    }

    const talkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mouth, { toValue: 10, duration: 170, useNativeDriver: false }),
        Animated.timing(mouth, { toValue: 3, duration: 150, useNativeDriver: false }),
      ])
    );

    talkLoop.start();
    return () => talkLoop.stop();
  }, [mouth, speaking]);

  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.92} onPress={onPress}>
      <Animated.View style={[styles.aura, { opacity: aura }]} />

      <Animated.View style={[styles.avatar, { transform: [{ translateY: bob }] }]}>
        <View style={[styles.head, skinColor ? { backgroundColor: skinColor } : {}]}>
          <View style={styles.faceTopLight} />
          <View style={styles.eyesRow}>
            <Animated.View style={[styles.eye, { transform: [{ scaleY: blink }] }]} />
            <Animated.View style={[styles.eye, { transform: [{ scaleY: blink }] }]} />
          </View>
          <Animated.View style={[styles.mouth, { height: mouth }]} />
        </View>

        <View style={[styles.shoulders, shirtColor ? { backgroundColor: shirtColor } : {}]}>
          <Ionicons name="sparkles" size={16} color={COLORS.white} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  aura: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#84DCC6',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F8C39B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#17324D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  faceTopLight: {
    position: 'absolute',
    top: 20,
    width: 70,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: -8,
  },
  eye: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#2F3640',
  },
  mouth: {
    marginTop: 16,
    width: 26,
    borderRadius: 8,
    backgroundColor: '#D9534F',
  },
  shoulders: {
    marginTop: -10,
    width: 150,
    height: 62,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

});

export default LivingAvatarStage;
