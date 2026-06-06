import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { useApp } from '../context/AppContext';
import {
  askOllamaAvatar,
  buildAvatarPrompt,
  getMedicalRefusalMessage,
  shouldRefuseMedicalRequest,
} from '../services/ollamaClient';

const FloatingAvatar = () => {
  const {
    userProfile,
    onboardingComplete,
    avatarMessage,
    avatarExpanded,
    setAvatarExpanded,
    avatarConfig,
    setAvatarMessage,
  } = useApp();

  const [input, setInput] = useState('');
  const [confusionScore, setConfusionScore] = useState(0);
  const [welcomed, setWelcomed] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (!onboardingComplete || welcomed) return;
    const name = userProfile?.name || 'friend';
    const welcome = `Hi ${name}, welcome. Did you know a 10 minute walk after meals can help glucose stay stable? How are you feeling today?`;
    setAvatarMessage(welcome);
    setAvatarExpanded(true);
    setWelcomed(true);
  }, [onboardingComplete, setAvatarExpanded, setAvatarMessage, userProfile?.name, welcomed]);

  useEffect(() => {
    if (!avatarExpanded) return;
    const timer = setTimeout(() => {
      setAvatarMessage('I am here to help. Would you like a simpler explanation?');
    }, 20000);

    return () => clearTimeout(timer);
  }, [avatarExpanded, setAvatarMessage]);

  useEffect(() => {
    if (confusionScore < 2) return;
    setAvatarMessage('No worries. I will guide you step by step. Tap Quick Help.');
    setConfusionScore(0);
  }, [confusionScore, setAvatarMessage]);

  const simplifyMessage = () => {
    const firstSentence = avatarMessage.split('.').slice(0, 1).join('.').trim();
    const simplified = `In simple words: ${firstSentence || avatarMessage}. Take your time.`;
    setAvatarMessage(simplified);
    setConfusionScore((s) => s + 1);
  };

  const localFallback = (text) => {
    const msg = text.toLowerCase();
    if (msg.includes('who are you') || msg.includes('your role') || msg.includes('qui es-tu') || msg.includes('qui es tu')) {
      return 'I am MoodGluco, a support assistant specialized in type 2 diabetes daily guidance.';
    }
    if (msg.includes('not understand') || msg.includes('confus') || msg.includes('help')) {
      return 'No worries, let us do one simple step now. Open Glucose, type your number, and tap Save.';
    }
    if (msg.includes('glucose') || msg.includes('sugar')) {
      return 'Simple tip: green is safe, red means alert. We can enter your glucose together now.';
    }
    if (msg.includes('medication') || msg.includes('insulin')) {
      return 'Medication tip: press one button to confirm each dose. I can remind you gently.';
    }
    return 'Thanks for sharing. I am here with you. Do you want a simpler explanation or a quick step by step guide?';
  };

  const onNaturalReply = async () => {
    const rawText = input.trim();
    if (!rawText) return;
    const text = rawText.toLowerCase();

    setIsThinking(true);

    if (shouldRefuseMedicalRequest(text)) {
      const refusal = getMedicalRefusalMessage();
      setAvatarMessage(refusal);
      setAvatarExpanded(true);
      setIsThinking(false);
      setInput('');
      return;
    }

    let nextMessage = '';

    if (text.includes('pas compris') || text.includes('confus') || text.includes('aide') || text.includes('help')) {
      setConfusionScore((s) => s + 1);
    }

    try {
      if (avatarConfig.useOllama && avatarConfig.ollamaEndpoint && avatarConfig.ollamaModel) {
        nextMessage = await askOllamaAvatar({
          endpoint: avatarConfig.ollamaEndpoint,
          model: avatarConfig.ollamaModel,
          prompt: buildAvatarPrompt({
            userProfile,
            userMessage: rawText,
            visionContext: '',
          }),
        });
      } else {
        nextMessage = localFallback(text);
      }
    } catch (error) {
      nextMessage = `${localFallback(text)} (Local AI unavailable, fallback mode.)`;
    }

    if (text.includes('?') || text.includes('hesite') || text.includes('hesitate')) {
      setConfusionScore((s) => s + 1);
    }

    setAvatarMessage(nextMessage);
    setAvatarExpanded(true);
    setIsThinking(false);
    setInput('');
  };

  if (!avatarExpanded) {
    return (
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAvatarExpanded(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.white} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.expandedContainer}>
      <View style={styles.bubble}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="happy" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.messageContainer}>
            <Text style={styles.avatarName}>MoodGluco</Text>
            <Text style={styles.messageText}>{avatarMessage}</Text>
            {isThinking && <Text style={styles.thinkingText}>Avatar is thinking...</Text>}

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickBtn} onPress={simplifyMessage}>
                <Text style={styles.quickBtnText}>Explain more simply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, styles.quickBtnAlt]}
                onPress={() => setAvatarMessage('Quick Help: Open Glucose, enter a value, then tap Save.')}
              >
                <Text style={styles.quickBtnText}>Quick Help</Text>
              </TouchableOpacity>
            </View>

            {avatarConfig.conversationMode && (
              <View style={styles.chatBox}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Talk naturally to your avatar"
                  placeholderTextColor={COLORS.textLight}
                  value={input}
                  onChangeText={setInput}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={onNaturalReply}>
                  <Ionicons name="send" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => setAvatarExpanded(false)}
        >
          <Ionicons name="close" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 100,
  },
  expandedContainer: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  bubble: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
  },
  avatarName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },
  thinkingText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  quickBtnAlt: {
    backgroundColor: `${COLORS.secondary}18`,
  },
  quickBtnText: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  chatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.text,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
});

export default FloatingAvatar;
