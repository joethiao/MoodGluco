/**
 * AnimatedAvatarImage
 * - Idle    : image statique + bob + breathe + blink naturel
 * - Réponse : vidéo montée une fois, play/pause selon speaking,
 *             démontée seulement après IDLE_LINGER_MS de silence total.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useApp } from '../context/AppContext';

// Délai avant de quitter la vidéo après la fin de la dernière phrase.
const IDLE_LINGER_MS = 1200;

export default function AnimatedAvatarImage({ speaking, style, size = 400 }) {
  const S = size;
  const { avatarConfig } = useApp();
  const gender  = avatarConfig?.gender || 'female';
  const bob     = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const [eyesClosed, setEyesClosed] = useState(false);
  const blinkRef = useRef(null);
  const idleRef  = useRef(null);
  const videoRef = useRef(null);

  // videoActive : la vidéo est-elle montée ?
  // Ne passe à false qu'après IDLE_LINGER_MS de silence complet.
  const [videoActive, setVideoActive] = useState(false);

  useEffect(() => {
    if (speaking) {
      // Annule tout timer d'extinction
      if (idleRef.current) { clearTimeout(idleRef.current); idleRef.current = null; }
      // Monte la vidéo si elle ne l'est pas déjà
      setVideoActive(true);
      // Play
      videoRef.current?.playAsync().catch(() => {});
    } else {
      // Pause immédiatement
      videoRef.current?.pauseAsync().catch(() => {});
      // Démonte seulement après IDLE_LINGER_MS (fin de réponse confirmée)
      idleRef.current = setTimeout(() => {
        setVideoActive(false);
        idleRef.current = null;
      }, IDLE_LINGER_MS);
    }
    return () => {
      if (idleRef.current) { clearTimeout(idleRef.current); idleRef.current = null; }
    };
  }, [speaking]);

  const getAvatarSource = (isClosed) => {
    if (gender === 'male') {
      return isClosed
        ? require('../../male_avatar_closed_eye.png')
        : require('../../male_avatar_opened_eye.png');
    }
    return isClosed
      ? require('../../female_avatar_closed_eye.png')
      : require('../../female_avatar_opened_eye.png');
  };

  const getVideoSource = () =>
    gender === 'male' ? require('../../male_Av_loop.mp4') : require('../../Av_loop.mp4');

  // Bob flottement
  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -10, duration: 2600, easing: ease, useNativeDriver: true }),
      Animated.timing(bob, { toValue:   0, duration: 2600, easing: ease, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [bob]);

  // Zoom respiration
  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.025, duration: 3400, easing: ease, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1.000, duration: 3400, easing: ease, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  // Clignement naturel (seulement sur l'image idle)
  useEffect(() => {
    if (videoActive) {
      setEyesClosed(false);
      if (blinkRef.current) clearTimeout(blinkRef.current);
      return;
    }
    const blink = () => {
      blinkRef.current = setTimeout(() => {
        setEyesClosed(true);
        setTimeout(() => {
          setEyesClosed(false);
          if (Math.random() < 0.15) {
            setTimeout(() => {
              setEyesClosed(true);
              setTimeout(() => { setEyesClosed(false); blink(); }, 120);
            }, 100);
          } else {
            blink();
          }
        }, 150);
      }, 3000 + Math.random() * 2000);
    };
    blink();
    return () => { if (blinkRef.current) clearTimeout(blinkRef.current); };
  }, [videoActive]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={{ width: S, height: S, transform: [{ translateY: bob }, { scale: breathe }] }}
      >
        {/* Image idle — toujours présente sous la vidéo */}
        <Animated.Image
          source={getAvatarSource(eyesClosed)}
          style={{ width: S, height: S, position: 'absolute', top: 0, left: 0 }}
          resizeMode="contain"
        />

        {/* Vidéo — montée pendant toute la réponse, play/pause selon speaking */}
        {videoActive && (
          <Video
            ref={videoRef}
            source={getVideoSource()}
            style={{ width: S, height: S, position: 'absolute', top: 0, left: 0 }}
            resizeMode={ResizeMode.CONTAIN}
            isMuted
            shouldPlay={speaking}
            isLooping
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
