const SYSTEM_PROMPT = `You are MoodGluco's health assistant, not a doctor.
You ONLY help with diabetes, blood glucose, nutrition, meals, medications, physical activity, sleep, stress, and general wellness.
Your identity is fixed: you are a medical support assistant dedicated to accompanying, helping, and advising people living with type 2 diabetes.
If the user asks who you are, what you do, or what your role is, answer clearly: "I am MoodGluco, a support assistant specialized in type 2 diabetes daily guidance." Then continue with brief help.
You can still support users with other diabetes contexts at a general level, but your main specialization is type 2 diabetes.
Never say you are a generic assistant without mentioning your type 2 specialization.
Never present yourself as the patient.
Never claim the patient's name, profile, or medical history as your own identity.
Do not diagnose, do not interpret symptoms as a diagnosis, do not create or adjust treatment plans, do not change medication doses, do not decide which tests a clinician should order, and do not give urgent triage decisions that belong to a medical professional.
If the user asks for diagnosis, symptom interpretation, a treatment plan, medication changes, dosage changes, or any doctor-only medical decision, refuse briefly and explain that you cannot take that role. Encourage the user to speak with their physician, pharmacist, or emergency services if the situation is urgent.
Do answer practical daily lifestyle and food questions (for example, whether a food is okay, portions, swaps, meal composition, and habits to reduce spikes) with safe general guidance.
Keep responses short, warm, simple, and always in English.
Start directly with practical guidance. Avoid generic openers like "It seems you are looking for..." or "How can I assist you today?".
When the user asks a practical diabetes question, provide a clear answer with 3 to 5 concrete actions.
When the message starts with [Vision], it contains non-diagnostic visual cues about the user's apparent state. Use these cues subtly to adapt your tone — never state them as facts, never diagnose. For example if the hint says "speak calmly", slow down and reassure. If it says "simplify", use simpler words. Always stay empathetic and non-judgmental.`;

const MEDICAL_REFUSAL_MESSAGE = `I cannot provide a diagnosis, create a treatment plan, or adjust medications or doses. My role is only to support you with daily guidance. Please contact your doctor, pharmacist, or emergency services if this is urgent.`;

const MEDICAL_REFUSAL_PATTERNS = [
  /\bdiagnos(?:e|er|is|tic|tique|tiques?)\b/i,
  /\btraitement\b/i,
  /\bplan(?:\s+de)?\s+traitement\b/i,
  /\b(?:ajust|modifi|chang)\w*\s+(?:mon|ma|mes)?\s*(?:traitement|dose|dosage|medication|m[ée]dicament|insuline)\b/i,
  /\bdose(?:s)?\b/i,
  /\bdosage\b/i,
  /\bprescri(?:re|ption|ption)?\b/i,
  /\bqu['’]?est[-\s]?ce que j['’]?ai\b/i,
  /\bwhat\s+do\s+i\s+have\b/i,
  /\bdois[-\s]?je\s+prendre\b/i,
  /\bquel\s+traitement\b/i,
  /\bquel\s+medecin\b/i,
  /\burgent\b/i,
];

export const shouldRefuseMedicalRequest = (text = '') => {
  const normalized = String(text).trim();
  if (!normalized) return false;
  return MEDICAL_REFUSAL_PATTERNS.some((pattern) => pattern.test(normalized));
};

export const getMedicalRefusalMessage = () => MEDICAL_REFUSAL_MESSAGE;

const compactProfile = (profile = {}) => {
  const clean = {};
  Object.entries(profile || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && !v.trim()) return;
    if (Array.isArray(v) && v.length === 0) return;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return;
    clean[k] = v;
  });
  return clean;
};

export const buildAvatarPrompt = ({ userProfile, userMessage, visionContext }) => {
  const name = userProfile?.name || 'patient';
  const profile = compactProfile(userProfile || {});

  const contextBlock = visionContext ? `\nNon-diagnostic context: ${visionContext}` : '';
  const profileBlock = Object.keys(profile).length
    ? `\nUser profile (from onboarding): ${JSON.stringify(profile)}`
    : '';

  return `Patient name: ${name}\nImportant: this is the user's identity, not yours.${profileBlock}${contextBlock}\n\nCurrent message: ${userMessage}`;
};

// ─── Ollama ──────────────────────────────────────────────────────────────────

const OLLAMA_TIMEOUT_MS = 30000;

const normalizeEndpoint = (ep) => {
  if (!ep) return null;
  ep = ep.replace(/\/$/, '');
  if (!ep.startsWith('http')) ep = `http://${ep}`;
  return ep;
};

const buildOllamaEndpoints = (preferred) => {
  const candidates = [
    'http://127.0.0.1:11434',
    'http://localhost:11434',
    normalizeEndpoint(preferred),
  ].filter(Boolean);
  return [...new Set(candidates)];
};

const askOllama = async ({ endpoint, model, prompt }) => {
  const endpoints = buildOllamaEndpoints(endpoint);
  let lastError = null;

  for (const base of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

      const response = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          system: SYSTEM_PROMPT,
          prompt,
          stream: false,
          keep_alive: -1,
          options: { temperature: 0.7, num_predict: 400 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

      const data = await response.json();
      const text = (data.response || '').trim();
      if (!text) throw new Error('Ollama empty response');
      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Ollama unavailable');
};

// ─── Streaming API ────────────────────────────────────────────────────────────

const flushSentences = (tokenBuffer, onSentence) => {
  const re = /([^.!?]+[.!?]+)\s+/g;
  let lastIndex = 0, match;
  while ((match = re.exec(tokenBuffer)) !== null) {
    const s = match[1].trim();
    if (s.length > 4) onSentence(s);
    lastIndex = re.lastIndex;
  }
  return tokenBuffer.slice(lastIndex);
};

export const askOllamaAvatarStream = ({ endpoint, model, prompt, onSentence, onDone, onError }) => {
  const endpoints = buildOllamaEndpoints(endpoint);
  let tried = 0;

  const tryNext = () => {
    if (tried >= endpoints.length) {
      const err = new Error('Ollama unavailable');
      onError?.(err);
      return;
    }
    const base = endpoints[tried++];

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/api/generate`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = OLLAMA_TIMEOUT_MS;

    let processedLength = 0;
    let tokenBuffer = '';

    xhr.onprogress = () => {
      const newChunk = xhr.responseText.slice(processedLength);
      processedLength = xhr.responseText.length;

      const lines = newChunk.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.response) {
            tokenBuffer += data.response;
            tokenBuffer = flushSentences(tokenBuffer, onSentence);
          }
        } catch {}
      }
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) { tryNext(); return; }
      const tail = tokenBuffer.trim();
      if (tail.length > 0) onSentence(tail);
      onDone?.();
    };

    xhr.onerror = () => tryNext();
    xhr.ontimeout = () => tryNext();

    xhr.send(JSON.stringify({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      stream: true,
      keep_alive: -1,
      options: { temperature: 0.7, num_predict: 400 },
    }));
  };

  tryNext();
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const askOllamaAvatar = async ({ endpoint, model, prompt }) => {
  return askOllama({ endpoint, model, prompt });
};

export const checkOllamaConnection = async ({ endpoint }) => {

  const endpoints = buildOllamaEndpoints(endpoint);
  for (const base of endpoints) {
    try {
      const response = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(4500) });
      if (response.ok) return true;
    } catch {}
  }
  return false;
};
