import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext(null);

const VALID_TTS_ENGINES = new Set(['native', 'edge', 'kokoro', 'piper', 'xtts', 'elevenlabs']);
const DEFAULT_TTS_ENGINE = VALID_TTS_ENGINES.has(process.env.EXPO_PUBLIC_TTS_ENGINE)
  ? process.env.EXPO_PUBLIC_TTS_ENGINE
  : 'native';

const defaultAvatarConfig = {
  gender: 'female',      // 'female' or 'male'
  archetypeId: 'sophie',
  skinId: 2,
  glasses: 'none',
  outfit: 1,
  voice: 'soft_feminine',
  ttsEngine: DEFAULT_TTS_ENGINE,
  ttsVoice: null,        // XTTS speaker name (null = default)
  ttsLanguage: 'en',     // XTTS synthesis language
  detailLevel: 'low',
  reminderFrequency: 'high',
  conversationMode: true,
  notifyFamilyOnMissedMed: true,
  useOllama: true,
  ollamaEndpoint: 'http://127.0.0.1:11434',
  ollamaModel: process.env.EXPO_PUBLIC_OLLAMA_MODEL || 'llama3.2:latest',
};

const normalizeAvatarConfig = (config = {}) => {
  const merged = { ...defaultAvatarConfig, ...config };
  if (!VALID_TTS_ENGINES.has(merged.ttsEngine)) {
    merged.ttsEngine = DEFAULT_TTS_ENGINE;
  }
  // Local-only mode by default (desktop/emulator): keep Ollama on localhost.
  merged.ollamaEndpoint = 'http://127.0.0.1:11434';
  if (process.env.EXPO_PUBLIC_OLLAMA_MODEL) {
    merged.ollamaModel = process.env.EXPO_PUBLIC_OLLAMA_MODEL;
  }
  return merged;
};

const generateDemoData = () => {
  const now = new Date();
  const moods = [];
  const glucose = [];
  const meals = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const morning = new Date(date);
    morning.setHours(8, 30, 0, 0);
    moods.push({
      id: `mood-${i}-am`,
      timestamp: morning.toISOString(),
      mood: Math.floor(Math.random() * 2) + 3,
      note: '',
    });
    glucose.push({
      id: `glu-${i}-am`,
      timestamp: morning.toISOString(),
      value: Math.floor(Math.random() * 40) + 90,
    });

    const lunch = new Date(date);
    lunch.setHours(12, 30, 0, 0);
    meals.push({
      id: `meal-${i}`,
      timestamp: lunch.toISOString(),
      name: i % 2 === 0 ? 'Salade composee' : 'Sandwich poulet',
      carbs: i % 2 === 0 ? 25 : 45,
      glycemicImpact: i % 2 === 0 ? 'low' : 'medium',
    });

    const evening = new Date(date);
    evening.setHours(19, 0, 0, 0);
    moods.push({
      id: `mood-${i}-pm`,
      timestamp: evening.toISOString(),
      mood: Math.floor(Math.random() * 3) + 2,
      note: i === 0 ? 'Stresse par le travail' : '',
    });
    glucose.push({
      id: `glu-${i}-pm`,
      timestamp: evening.toISOString(),
      value: Math.floor(Math.random() * 60) + 100,
    });
  }

  const medications = [
    {
      id: 'med-1',
      name: 'Metformine',
      dosage: '500mg',
      schedule: ['08:00', '20:00'],
      taken: { [new Date().toISOString().split('T')[0]]: true },
    },
    {
      id: 'med-2',
      name: 'Insuline rapide',
      dosage: '10 UI',
      schedule: ['08:00', '12:00', '19:00'],
      taken: {},
    },
  ];

  return { moods, glucose, meals, medications };
};

export const AppProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [avatarConfig, setAvatarConfig] = useState(defaultAvatarConfig);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [moods, setMoods] = useState([]);
  const [glucose, setGlucose] = useState([]);
  const [meals, setMeals] = useState([]);
  const [medications, setMedications] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [avatarMessage, setAvatarMessage] = useState('Bonjour ! Comment allez-vous ?');
  const [avatarExpanded, setAvatarExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('moodgluco_data');
      if (saved) {
        const data = JSON.parse(saved);
        setUserProfile(data.userProfile || null);
        setOnboardingComplete(data.onboardingComplete || false);
        setMoods(data.moods || []);
        setGlucose(data.glucose || []);
        setMeals(data.meals || []);
        setMedications(data.medications || []);
        setFamilyMembers(data.familyMembers || []);
        setAvatarConfig(normalizeAvatarConfig(data.avatarConfig || {}));
      }
    } catch (e) {
      console.log('Load error:', e);
    }
  };

  const saveData = async (data) => {
    try {
      await AsyncStorage.setItem('moodgluco_data', JSON.stringify(data));
    } catch (e) {
      console.log('Save error:', e);
    }
  };

  const updateAndSave = (updates) => {
    const newData = {
      userProfile: updates.userProfile !== undefined ? updates.userProfile : userProfile,
      onboardingComplete: updates.onboardingComplete !== undefined ? updates.onboardingComplete : onboardingComplete,
      moods: updates.moods !== undefined ? updates.moods : moods,
      glucose: updates.glucose !== undefined ? updates.glucose : glucose,
      meals: updates.meals !== undefined ? updates.meals : meals,
      medications: updates.medications !== undefined ? updates.medications : medications,
      familyMembers: updates.familyMembers !== undefined ? updates.familyMembers : familyMembers,
      avatarConfig: updates.avatarConfig !== undefined ? updates.avatarConfig : avatarConfig,
    };
    saveData(newData);
  };

  const addMood = (entry) => {
    const newMood = { ...entry, id: Date.now().toString() };
    const updated = [...moods, newMood];
    setMoods(updated);
    updateAndSave({ moods: updated });
  };

  const addGlucose = (entry) => {
    const newG = { ...entry, id: Date.now().toString() };
    const updated = [...glucose, newG];
    setGlucose(updated);
    updateAndSave({ glucose: updated });
  };

  const addMeal = (entry) => {
    const newM = { ...entry, id: Date.now().toString() };
    const updated = [...meals, newM];
    setMeals(updated);
    updateAndSave({ meals: updated });
  };

  const addMedication = (med) => {
    const updated = [...medications, med];
    setMedications(updated);
    updateAndSave({ medications: updated });
  };

  const toggleMedicationTaken = (medId, date) => {
    const updated = medications.map((m) => {
      if (m.id === medId) {
        return { ...m, taken: { ...m.taken, [date]: !m.taken[date] } };
      }
      return m;
    });
    setMedications(updated);
    updateAndSave({ medications: updated });
  };

  const addFamilyMember = (member) => {
    const updated = [...familyMembers, member];
    setFamilyMembers(updated);
    updateAndSave({ familyMembers: updated });
  };

  const loadDemoData = () => {
    const demo = generateDemoData();
    setMoods(demo.moods);
    setGlucose(demo.glucose);
    setMeals(demo.meals);
    setMedications(demo.medications);
    setUserProfile({ name: 'Marie', diabetesType: 'prediabetes', treatments: ['Metformine'], doctorName: 'Dr. Dupont' });
    setOnboardingComplete(true);
    updateAndSave({
      moods: demo.moods,
      glucose: demo.glucose,
      meals: demo.meals,
      medications: demo.medications,
      userProfile: { name: 'Marie', diabetesType: 'prediabetes', treatments: ['Metformine'], doctorName: 'Dr. Dupont' },
      onboardingComplete: true,
      avatarConfig: defaultAvatarConfig,
    });
  };

  const handleSetUserProfile = (p) => {
    setUserProfile(p);
    updateAndSave({ userProfile: p });
  };

  const handleSetOnboarding = (v) => {
    setOnboardingComplete(v);
    updateAndSave({ onboardingComplete: v });
  };

  const handleSetAvatarConfig = (c) => {
    const normalized = normalizeAvatarConfig(c);
    setAvatarConfig(normalized);
    updateAndSave({ avatarConfig: normalized });
  };

  return (
    <AppContext.Provider
      value={{
        userProfile,
        setUserProfile: handleSetUserProfile,
        avatarConfig,
        setAvatarConfig: handleSetAvatarConfig,
        onboardingComplete,
        setOnboardingComplete: handleSetOnboarding,
        moods,
        addMood,
        glucose,
        addGlucose,
        meals,
        addMeal,
        medications,
        addMedication,
        toggleMedicationTaken,
        familyMembers,
        addFamilyMember,
        avatarMessage,
        setAvatarMessage,
        avatarExpanded,
        setAvatarExpanded,
        loadDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};
