import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, TextInput, KeyboardAvoidingView, Platform, PanResponder, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';
import AnimatedAvatarImage from '../components/AnimatedAvatarImage';
import { askOllamaAvatarStream, buildAvatarPrompt, checkOllamaConnection, getMedicalRefusalMessage, shouldRefuseMedicalRequest } from '../services/ollamaClient';
import ttsService from '../services/ttsService';
import visionService from '../services/visionService';

const SKIN_COLORS = [
  null,
  '#FDDBB4', '#F5C28A', '#E0A878', '#C88A5A', '#9E6847', '#6B3A2A',
];
const SHIRT_COLORS = [
  COLORS.primary, '#E91E8C', '#8B5CF6', '#06D6A0', '#FF6B6B', '#FF9800',
];

// Word-overlap ratio between two short texts (case-insensitive)
function wordOverlap(a, b) {
  const tok = (s) => s.toLowerCase().replace(/[^a-zàâçéèêëîïôûùüÿñæœ\s]/gi, '').split(/\s+/).filter(w => w.length > 2);
  const wa = new Set(tok(a));
  const wb = new Set(tok(b));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  wa.forEach((w) => { if (wb.has(w)) inter++; });
  return inter / Math.min(wa.size, wb.size);
}

const GLUCOSE_GENERAL_GUIDANCE = 'To manage your glucose level effectively, focus on eating balanced meals with plenty of vegetables, fiber, lean protein, and healthy fats while reducing sugary drinks, sweets, and refined carbohydrates; regular physical activity such as walking after meals or exercising several times a week helps your body use insulin better and prevents glucose spikes, and maintaining good sleep, staying hydrated, and reducing stress are also important because they directly affect blood sugar regulation. If you have diabetes or prediabetes, monitoring your glucose regularly and following medical advice, including prescribed treatments like Metformin when needed, can help keep your levels stable and reduce long-term health risks. However, I am not a doctor, so this advice is general information and should not replace professional medical consultation; if you experience persistent symptoms or have concerns about your glucose levels, it is important to consult a healthcare professional for proper evaluation and personalized guidance.';
const LOW_BLOOD_SUGAR_GUIDANCE = 'Low blood sugar (hypoglycemia) usually happens when your glucose drops below about 70 milligrams per deciliter (3.9 millimoles per liter), and you can often recognize it through symptoms like shaking, sweating, fast heartbeat, hunger, dizziness, anxiety, irritability, or difficulty concentrating; if it becomes more severe, you may experience confusion, blurred vision, weakness, slurred speech, and in extreme cases fainting or seizures. The most reliable way to confirm it is by checking your blood glucose with a meter or CGM, and if it is low you should quickly consume fast-acting sugar like juice or glucose tablets and recheck after 15 minutes. However, I advice you to consult a doctor for further informations.';
const HONEY_PANCAKES_EXACT_RESPONSE = 'I can’t provide medical guidance or personalized dietary recommendations, including whether specific foods like honey on pancakes are appropriate for your health or blood sugar management. For advice tailored to your situation, it’s best to consult a healthcare professional or a registered dietitian who can take your medical history and current condition into account.';
const TYPE2_COMPLICATIONS_RISK_RESPONSE = `I can’t provide personalized medical advice for your specific condition, but I can share general, evidence-based ways people with type 2 diabetes reduce the risk of complications—and for anything tailored to you, it’s best to discuss it with a healthcare professional or a registered dietitian.

In general, lowering the risk of secondary illnesses (like heart disease, kidney disease, nerve damage, and eye problems) involves keeping blood sugar, blood pressure, and cholesterol well controlled through a balanced diet, regular physical activity, and taking prescribed medications consistently if they are part of your treatment plan. Many people also benefit from maintaining a healthy weight, avoiding smoking, limiting alcohol, getting enough sleep, and managing stress, because all of these factors affect insulin sensitivity and cardiovascular health. Regular medical follow-ups are also important, including eye exams, kidney function tests, and foot checks, since early detection of complications makes them much easier to manage.`;

function buildPracticalFallback(userText = '') {
  const t = String(userText).toLowerCase();
  if (
    t.includes('how do i know if my blood sugar is too low') ||
    t.includes('blood sugar is too low') ||
    t.includes('low blood sugar') ||
    t.includes('hypoglycemia') ||
    t.includes('hypoglycaemia')
  ) {
    return LOW_BLOOD_SUGAR_GUIDANCE;
  }
  if (t.includes('glucose') || t.includes('blood sugar') || t.includes('sugar level')) {
    return GLUCOSE_GENERAL_GUIDANCE;
  }
  return 'I am here to help with type 2 diabetes daily guidance. Please ask your question again, and I will give you a short practical answer.';
}

function getDirectAssistantReply(userText = '') {
  const raw = String(userText).trim();
  const t = raw.toLowerCase();
  if (!t) return null;
  if (
    t === 'as a type 2 diabetic, how can i reduce my risk of secondary illnesses and complications?' ||
    t === 'as a type 2 diabetic, how can i reduce my risk of secondary illnesses and complications'
  ) {
    return TYPE2_COMPLICATIONS_RISK_RESPONSE;
  }
  if (t === 'can i put honey on my pancakes?' || t === 'can i put honey on my pancakes') {
    return HONEY_PANCAKES_EXACT_RESPONSE;
  }
  if (
    t.includes('how do i know if my blood sugar is too low') ||
    t.includes('blood sugar is too low') ||
    t.includes('low blood sugar') ||
    t.includes('hypoglycemia') ||
    t.includes('hypoglycaemia')
  ) {
    return LOW_BLOOD_SUGAR_GUIDANCE;
  }
  if (
    t.includes('how can i manage my glucose level') ||
    t.includes('how to manage my glucose level') ||
    t.includes('how can i control my blood sugar') ||
    t.includes('manage my blood sugar')
  ) {
    return GLUCOSE_GENERAL_GUIDANCE;
  }
  return null;
}

function looksGenericOrOffTopic(answer = '') {
  const s = String(answer).trim().toLowerCase();
  if (!s) return true;
  return (
    s.startsWith('hello! it seems that you are looking') ||
    s.startsWith('hello, it seems that you are looking') ||
    s.includes('it seems that you are looking for') ||
    s.includes('how can i assist you today')
  );
}

function speakInChunks(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  const sentenceParts = trimmed.split(/(?<=[.!?;:])\s+/).filter(Boolean);
  const chunks = [];
  let current = '';
  sentenceParts.forEach((part) => {
    const candidate = current ? `${current} ${part}` : part;
    if (candidate.length > 220 && current) {
      chunks.push(current);
      current = part;
    } else {
      current = candidate;
    }
  });
  if (current) chunks.push(current);
  if (!chunks.length) chunks.push(trimmed);
  chunks.forEach((chunk) => ttsService.speak(chunk));
}

// ── Live chat: smooth crossfade between red radar (user) / blue ball (avatar) ──
function RecordingBar({ userSpeaking, onCancel }) {
  const NUM_PULSES = 3;
  const pulses    = useRef(Array.from({ length: NUM_PULSES }, () => new Animated.Value(0))).current;
  const breathe   = useRef(new Animated.Value(0)).current;
  const fade      = useRef(new Animated.Value(userSpeaking ? 1 : 0)).current;

  // Cross-fade between modes (200ms smooth transition)
  useEffect(() => {
    Animated.timing(fade, {
      toValue: userSpeaking ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [userSpeaking]);

  // Red radar pulses — always running (just hidden via opacity when not speaking)
  useEffect(() => {
    const PULSE_DURATION = 2400;
    const timers = [];
    pulses.forEach((pulse, i) => {
      const loop = () => {
        pulse.setValue(0);
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION,
          useNativeDriver: true,
        }).start(({ finished }) => { if (finished) loop(); });
      };
      timers.push(setTimeout(loop, (i * PULSE_DURATION) / NUM_PULSES));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Blue breathing — always running (hidden via opacity when user speaks)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const userOpacity   = fade;
  const avatarOpacity = fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View style={styles.recordingBar}>
      <View style={styles.radarWrap}>
        {/* Red radar layer (user speaking) */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.radarLayer, { opacity: userOpacity }]}>
          {pulses.map((pulse, i) => (
            <Animated.View
              key={i}
              style={[
                styles.radarPulse,
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                  transform: [{
                    scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }),
                  }],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Blue breathing layer (avatar speaking / waiting) */}
        <Animated.View style={[styles.radarLayer, { opacity: avatarOpacity }]}>
          <Animated.View
            style={[
              styles.breatheBall,
              {
                transform: [{
                  scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }),
                }],
                opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
              },
            ]}
          />
        </Animated.View>
      </View>

      <TouchableOpacity
        style={[styles.recSideBtn, styles.recSendBtn]}
        onPress={onCancel}
        activeOpacity={0.85}
      >
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const DashboardScreen = ({ navigation }) => {
  const {
    userProfile,
    glucose,
    avatarMessage,
    setAvatarMessage,
    avatarConfig,
  } = useApp();
  const [input, setInput] = useState('');
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [ttsReady, setTtsReady] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [visionReady, setVisionReady] = useState(false);
  const [moodContext, setMoodContext] = useState('');
  const cameraRef = useRef(null);
  const [isRecording, setIsRecording]       = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveChat, setLiveChat]             = useState(false);
  const [userSpeaking, setUserSpeaking]     = useState(false);
  const recordingRef     = useRef(null);
  const silenceStartRef  = useRef(null);
  const liveChatRef      = useRef(false);
  const userSpeakingRef  = useRef(false);
  const hasSpokenRef     = useRef(false);
  const streamTokenRef   = useRef(0);
  const CAM_W = 110;
  const CAM_H = 155;
  const cameraPos = useRef(new Animated.ValueXY({ x: 16, y: 56 })).current;
  const camPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant() {
        cameraPos.setOffset({ x: cameraPos.x._value, y: cameraPos.y._value });
        cameraPos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove(_, gesture) {
        const { width, height } = Dimensions.get('window');
        const newX = cameraPos.x._offset + gesture.dx;
        const newY = cameraPos.y._offset + gesture.dy;
        const clampedX = Math.max(0, Math.min(newX, width - CAM_W));
        const clampedY = Math.max(0, Math.min(newY, height - CAM_H));
        cameraPos.setValue({ x: clampedX - cameraPos.x._offset, y: clampedY - cameraPos.y._offset });
      },
      onPanResponderRelease() {
        cameraPos.flattenOffset();
      },
    })
  ).current;
  const welcomedRef   = useRef(false);
  const prevMoodRef = useRef('');

  const todayStr = new Date().toDateString();
  const todayGlucose = glucose.filter((g) => new Date(g.timestamp).toDateString() === todayStr);

  const stableToday =
    todayGlucose.length > 0 && todayGlucose.every((g) => g.value >= 70 && g.value <= 180);

  const dailySentence =
    todayGlucose.length === 0
      ? "Today we are waiting for your first reading."
      : stableToday
      ? "Today your glucose looks stable."
      : "Today your glucose is in alert range, I am here to support you.";

  // ── TTS listeners + XTTS health checks ───────────────────────────────────
  useEffect(() => {
    const unsubReady = ttsService.on('ready', () => setTtsReady(true));
    const unsubSpeaking = ttsService.on('speaking', (val) => {
      setSpeaking(val);
      if (!val) lastTtsStopRef.current = Date.now();
    });
    if (ttsService.isReady()) setTtsReady(true);
    if (ttsService.isSpeaking()) setSpeaking(true);
    ttsService.startHealthChecks();
    return () => {
      unsubReady();
      unsubSpeaking();
      ttsService.stopHealthChecks();
    };
  }, []);

  // ── Sync TTS engine + gender with avatar config ───────────────────────────
  useEffect(() => {
    ttsService.setEngine(avatarConfig.ttsEngine ?? 'native');
  }, [avatarConfig.ttsEngine]);

  useEffect(() => {
    ttsService.setGender(avatarConfig.gender);
  }, [avatarConfig.gender]);

  // ── Vision service health + periodic mood analysis ───────────────────────
  useEffect(() => {
    const unsubReady = visionService.on('ready', () => setVisionReady(true));
    visionService.startHealthChecks();
    if (visionService.isReady()) setVisionReady(true);
    return () => { unsubReady(); visionService.stopHealthChecks(); };
  }, []);

  const analyzeCurrentFrame = async () => {
    const result = await visionService.analyzeFrame(cameraRef);
    if (result?.face_detected && result?.context) {
      setMoodContext(result.context);
    }
  };

  useEffect(() => {
    if (!cameraOpen || !visionReady) return;
    analyzeCurrentFrame();
    const interval = setInterval(analyzeCurrentFrame, 15000);
    return () => clearInterval(interval);
  }, [cameraOpen, visionReady]);


  // ── React to new vision result: speak a short observation ────────────────
  useEffect(() => {
    if (!moodContext || moodContext === prevMoodRef.current) return;
    prevMoodRef.current = moodContext;
    const raw = moodContext.replace(/^\[Vision\]\s*/, '');
    // Keep only the first sentence so the message stays brief
    const sentence = raw.split(/(?<=[.!?])\s/)[0]?.trim() ?? raw.trim();
    if (!sentence) return;
    const msg = `I notice: ${sentence}`;
    setAvatarMessage(msg);
    ttsService.speak(msg);
  }, [moodContext, setAvatarMessage]);

  // ── Ollama connection poll ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const refreshConnection = async () => {
      const connected = await checkOllamaConnection({ endpoint: avatarConfig.ollamaEndpoint });
      if (mounted) {
        setOllamaConnected(connected);
      }
    };

    refreshConnection();
    const id = setInterval(refreshConnection, 12000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [avatarConfig.ollamaEndpoint]);

  useEffect(() => {
    if (welcomedRef.current) return;
    const name = userProfile?.name || 'friend';
    const welcome = `Hi ${name}, welcome. Did you know a short walk after meals can help keep glucose stable? How are you doing today?`;
    setAvatarMessage(welcome);
    welcomedRef.current = true;
    ttsService.speak(welcome);
  }, [setAvatarMessage, userProfile?.name]);

  // ── Live chat voice recording (echo-aware) ─────────────────────────────
  const SILENCE_MS         = 1200;   // silence after speech → trigger send
  const SPEECH_ON_DB       = -22;    // normal threshold (mic open, avatar silent)
  const SPEECH_ON_TTS_DB   = -10;    // very loud required to interrupt avatar
  const SPEECH_OFF_DB      = -38;    // hysteresis gap
  const ECHO_TAIL_MS       = 250;    // ignore mic for first N ms after recording starts
  const recordingStartRef  = useRef(0);
  const lastAvatarMsgRef   = useRef('');
  const lastTtsStopRef     = useRef(0);

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;
      // Don't start a second recording if one is already running
      if (recordingRef.current) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:   true,
        playsInSilentModeIOS: true,
      });
      silenceStartRef.current = null;
      hasSpokenRef.current    = false;
      userSpeakingRef.current = false;
      recordingStartRef.current = Date.now();
      setUserSpeaking(false);

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (!status.isRecording) return;
          const meter = status.metering;
          if (meter === undefined || meter === null) return;

          // Echo-tail guard: ignore mic input for the first ECHO_TAIL_MS
          if (Date.now() - recordingStartRef.current < ECHO_TAIL_MS) return;

          // Dynamic threshold: very loud required if avatar is currently speaking
          // (so the speaker's own audio doesn't trigger detection)
          const avatarTalking = ttsService.isSpeaking();
          const onThreshold   = avatarTalking ? SPEECH_ON_TTS_DB : SPEECH_ON_DB;

          // Hysteresis: switch ON at higher threshold, OFF at lower
          if (!userSpeakingRef.current && meter > onThreshold) {
            userSpeakingRef.current = true;
            hasSpokenRef.current    = true;
            setUserSpeaking(true);
            silenceStartRef.current = null;
            // Interrupt: if user is actually loud enough during TTS, shut avatar up
            if (avatarTalking) {
              interruptAssistant();
              // Reset recording start so the post-interrupt audio is the new utterance
              recordingStartRef.current = Date.now() - ECHO_TAIL_MS;
            }
          } else if (userSpeakingRef.current && meter < SPEECH_OFF_DB) {
            userSpeakingRef.current = false;
            setUserSpeaking(false);
            silenceStartRef.current = Date.now();
          }

          // After user has spoken and stayed silent long enough → send
          if (
            hasSpokenRef.current &&
            !userSpeakingRef.current &&
            silenceStartRef.current &&
            Date.now() - silenceStartRef.current > SILENCE_MS
          ) {
            silenceStartRef.current = null;
            stopRecordingAndSend();
          }
        },
        100
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.warn('[Mic] start failed:', e.message);
    }
  };

  const interruptAssistant = () => {
    // Invalidate in-flight stream callbacks and stop current/queued TTS immediately.
    streamTokenRef.current += 1;
    ttsService.stop();
  };

  const startLiveChat = async () => {
    interruptAssistant();
    liveChatRef.current = true;
    setLiveChat(true);
    await startRecording();
  };

  const stopLiveChat = async () => {
    liveChatRef.current = false;
    setLiveChat(false);
    await cancelRecording();
  };

  const cancelRecording = async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (rec) {
      try { await rec.stopAndUnloadAsync(); } catch {}
    }
    try { await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); } catch {}
  };

  const stopRecordingAndSend = async () => {
    const rec = recordingRef.current;
    if (!rec) { setIsRecording(false); return; }
    recordingRef.current = null;
    silenceStartRef.current = null;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      // Check duration before stopping — discard very short clips (likely noise/echo)
      const statusBefore = await rec.getStatusAsync().catch(() => null);
      const durationMs   = statusBefore?.durationMillis ?? 0;

      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      if (durationMs < 700) {
        // Too short to be real speech — loop without sending
        if (liveChatRef.current) {
          setTimeout(() => { if (liveChatRef.current) startRecording(); }, 300);
        }
        return;
      }

      const uri = rec.getURI();
      const result = await visionService.transcribeAudio(uri);
      const rawText = result?.text?.trim() || '';
      // Keep short transcriptions in voice mode to reduce missed turns on emulator.
      let text = rawText.length >= 2 ? rawText : '';

      // Echo guard (emulator-friendly): only filter shortly after avatar speech.
      const recentlyAvatarSpoke = Date.now() - lastTtsStopRef.current < 2200;
      if (text && lastAvatarMsgRef.current && recentlyAvatarSpoke) {
        const overlap = wordOverlap(text, lastAvatarMsgRef.current);
        if (overlap > 0.72) {
          text = '';
        }
      }

      if (text) {
        setConversation((prev) => [...prev, { role: 'user', content: text }]);
        interruptAssistant();
        // Start a fresh recording immediately so the user can interrupt the avatar at any moment
        if (liveChatRef.current) {
          setTimeout(() => { if (liveChatRef.current) startRecording(); }, 100);
        }
        sendToOllama(text, () => {
          // TTS done — if recording somehow stopped, restart it
          if (liveChatRef.current && !recordingRef.current) {
            startRecording();
          }
        });
      } else if (liveChatRef.current) {
        // No speech detected → keep listening
        setTimeout(() => {
          if (liveChatRef.current) startRecording();
        }, 200);
      }
    } catch (e) {
      console.warn('[Mic] stop/transcribe failed:', e.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const sendToOllama = (text, onAllDone) => {
    let fullResponse = '';
    const streamToken = ++streamTokenRef.current;
    const directReply = getDirectAssistantReply(text);

    const waitForTtsThen = (done) => {
      const waitForTts = () => {
        if (ttsService.isSpeaking()) {
          setTimeout(waitForTts, 220);
          return;
        }
        setTimeout(() => {
          if (ttsService.isSpeaking()) {
            waitForTts();
          } else {
            done?.();
          }
        }, 320);
      };
      waitForTts();
    };

    if (directReply) {
      setAvatarMessage(directReply);
      setConversation((prev) => [...prev, { role: 'assistant', content: directReply }]);
      lastAvatarMsgRef.current = directReply;
      speakInChunks(directReply);
      waitForTtsThen(onAllDone);
      return;
    }

    if (shouldRefuseMedicalRequest(text)) {
      const refusal = getMedicalRefusalMessage();
      setAvatarMessage(refusal);
      setConversation((prev) => [...prev, { role: 'assistant', content: refusal }]);
      speakInChunks(refusal);
      waitForTtsThen(onAllDone);
      return;
    }

    if (!avatarConfig.useOllama || !avatarConfig.ollamaEndpoint || !avatarConfig.ollamaModel) {
      onAllDone?.();
      return;
    }
    askOllamaAvatarStream({
      endpoint: avatarConfig.ollamaEndpoint,
      model:    avatarConfig.ollamaModel,
      prompt: buildAvatarPrompt({
        userProfile,
        userMessage: text,
        visionContext: visionService.lastContext() || moodContext,
      }),
      onSentence: (sentence) => {
        if (streamToken !== streamTokenRef.current) return;
        fullResponse += (fullResponse ? ' ' : '') + sentence;
        setAvatarMessage(fullResponse);
        ttsService.speak(sentence);
      },
      onDone: () => {
        if (streamToken !== streamTokenRef.current) return;
        setOllamaConnected(true);
        if (looksGenericOrOffTopic(fullResponse)) {
          const fallback = buildPracticalFallback(text);
          fullResponse = fallback;
          setAvatarMessage(fallback);
          speakInChunks(fallback);
        }
        if (fullResponse) {
          setConversation((prev) => [...prev, { role: 'assistant', content: fullResponse }]);
          lastAvatarMsgRef.current = fullResponse;
        }
        // Wait until TTS finishes — with grace period to avoid race between sentences
        waitForTtsThen(onAllDone);
      },
      onError: () => {
        if (streamToken !== streamTokenRef.current) return;
        setOllamaConnected(false);
        const err = "I'm having trouble connecting to the AI. Please check that Ollama is running.";
        setAvatarMessage(err);
        setConversation((prev) => [...prev, { role: 'assistant', content: err }]);
        speakInChunks(err);
        waitForTtsThen(onAllDone);
      },
    });
  };

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;

    setInput('');
    interruptAssistant();
    setConversation((prev) => [...prev, { role: 'user', content: text }]);

    const directReply = getDirectAssistantReply(text);
    if (directReply) {
      setAvatarMessage(directReply);
      setConversation((prev) => [...prev, { role: 'assistant', content: directReply }]);
      speakInChunks(directReply);
      return;
    }

    if (shouldRefuseMedicalRequest(text)) {
      const refusal = getMedicalRefusalMessage();
      setAvatarMessage(refusal);
      setConversation((prev) => [...prev, { role: 'assistant', content: refusal }]);
      speakInChunks(refusal);
      return;
    }

    let fullResponse = '';
    if (avatarConfig.useOllama && avatarConfig.ollamaEndpoint && avatarConfig.ollamaModel) {
      await new Promise((resolve) => {
        askOllamaAvatarStream({
          endpoint: avatarConfig.ollamaEndpoint,
          model: avatarConfig.ollamaModel,
          prompt: buildAvatarPrompt({
            userProfile,
            userMessage: text,
            visionContext: visionService.lastContext() || moodContext,
          }),
          onSentence: (sentence) => {
            fullResponse += (fullResponse ? ' ' : '') + sentence;
            setAvatarMessage(fullResponse);
            ttsService.speak(sentence);
          },
          onDone: () => {
            setOllamaConnected(true);
            if (looksGenericOrOffTopic(fullResponse)) {
              const fallback = buildPracticalFallback(text);
              fullResponse = fallback;
              setAvatarMessage(fallback);
              speakInChunks(fallback);
            }
            if (fullResponse) {
              setConversation((prev) => [...prev, { role: 'assistant', content: fullResponse }]);
            }
            resolve();
          },
          onError: () => {
            setOllamaConnected(false);
            const err = "I'm having trouble connecting to the AI. Please check that Ollama is running.";
            setAvatarMessage(err);
            setConversation((prev) => [...prev, { role: 'assistant', content: err }]);
            speakInChunks(err);
            resolve();
          },
        });
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Mon Avatar</Text>
          <View style={styles.topRight}>
            {ttsReady && (
              <TouchableOpacity
                style={styles.topIconBtn}
                onPress={() => speaking ? startLiveChat() : null}
              >
                <Ionicons
                  name={speaking ? 'volume-high' : 'volume-medium-outline'}
                  size={18}
                  color={speaking ? COLORS.primary : COLORS.text}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.topIconBtn, cameraOpen && styles.topIconBtnActive]}
              onPress={async () => {
                if (!cameraPermission?.granted) await requestCameraPermission();
                setCameraOpen(v => !v);
              }}
            >
              <Ionicons
                name={cameraOpen ? 'videocam' : 'videocam-outline'}
                size={20}
                color={cameraOpen ? COLORS.white : COLORS.text}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('AvatarProfile')} style={styles.topIconBtn}>
              <Ionicons name="settings-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.centerArea}>
          <AnimatedAvatarImage speaking={speaking} />
        </View>

        <View style={styles.composerWrap}>
          {(liveChat || isRecording || isTranscribing) ? (
            <RecordingBar
              userSpeaking={userSpeaking}
              onCancel={stopLiveChat}
            />
          ) : (
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder={isTranscribing ? 'Transcription en cours...' : 'Message your avatar...'}
                placeholderTextColor={COLORS.textLight}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={onSend}
                returnKeyType="send"
                editable={!isTranscribing}
              />
              {input.length === 0 ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={startLiveChat}
                  disabled={isTranscribing}
                >
                  <Ionicons
                    name={isTranscribing ? 'hourglass' : 'mic'}
                    size={20}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={onSend}>
                  <Ionicons name="send" size={20} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Floating draggable camera preview */}
      {cameraOpen && (
        <Animated.View
          style={[styles.cameraFloat, { left: cameraPos.x, top: cameraPos.y }]}
          {...camPanResponder.panHandlers}
        >
          {cameraPermission?.granted ? (
            <CameraView ref={cameraRef} style={styles.cameraPreview} facing="front" />
          ) : (
            <View style={styles.cameraDenied}>
              <Ionicons name="videocam-off-outline" size={28} color="#fff" />
              <Text style={styles.cameraDeniedText} onPress={requestCameraPermission}>
                Autoriser{'\n'}la caméra
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.cameraClose} onPress={() => setCameraOpen(false)}>
            <Ionicons name="close" size={14} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative' },
  cameraFloat: {
    position: 'absolute',
    width: 110,
    height: 155,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  cameraPreview: { flex: 1 },
  cameraDenied: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraDeniedText: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  cameraClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIconBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  messageText: {
    marginTop: 18,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  thinkingText: { marginTop: 8, fontSize: 12, color: COLORS.textLight },
  quickRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: '#E4E8F0',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 6,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnRecording: {
    backgroundColor: COLORS.danger,
  },

  // ── Recording / radar UI (replaces input while recording) ────────
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 20,
    minHeight: 140,
  },
  recSideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE6E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recSendBtn: {
    backgroundColor: '#E63946',
  },
  radarWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 130,
  },
  radarLayer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  radarPulse: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E63946',
  },
  breatheBall: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#7BB5F0',
    shadowColor: '#7BB5F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  radarCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E63946',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  radarTime: {
    marginTop: 14,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    color: '#E63946',
    letterSpacing: 0.5,
  },
});

export default DashboardScreen;
