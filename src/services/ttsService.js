/**
 * ttsService — multi-engine TTS singleton.
 *
 * Engines:
 *   'native' — expo-speech (device TTS, instant, no server)
 *   'edge'   — Edge TTS server  http://127.0.0.1:5003  (free, Microsoft neural voices)
 *   'kokoro' — Kokoro server    http://127.0.0.1:5004  (local neural, ~200ms)
 *   'piper'  — Piper server     http://127.0.0.1:5005  (local, real-time)
 *   'xtts'   — XTTS v2 server   http://127.0.0.1:5002  (local, highest quality)
 *
 * Events: 'ready' | 'speaking' | 'error'
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

const LOCAL_HOST = '127.0.0.1';
const TTS_DEBUG = false;
const tlog = (...args) => { if (TTS_DEBUG) console.log(...args); };

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const ELEVENLABS_MODEL_ID = process.env.EXPO_PUBLIC_ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const ELEVENLABS_VOICE_ID_FEMALE = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVENLABS_VOICE_ID_MALE = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID_MALE || 'pNInz6obpgDQGcFmaJgB';


// ─── Native TTS profiles ─────────────────────────────────────────────────────
const NATIVE_PROFILES = {
  female: { pitch: 1.1,  rate: 0.92 },
  male:   { pitch: 0.82, rate: 0.88 },
};
const NATIVE_MALE_NAMES   = ['alex', 'daniel', 'tom', 'aaron', 'fred', 'thomas', 'oliver'];
const NATIVE_FEMALE_NAMES = ['samantha', 'victoria', 'karen', 'moira', 'tessa', 'ava', 'allison'];

// ─── Server-based engine configs ─────────────────────────────────────────────
const SERVER_ENGINES = {
  edge: {
    port:       5003,
    voiceParam: 'voice',
    ext:        'mp3',
    mime:       'audio/mpeg',
    voices: {
      female: 'en-US-JennyNeural',
      male:   'en-US-AndrewNeural',
    },
  },
  kokoro: {
    port:       5004,
    voiceParam: 'voice',
    ext:        'wav',
    mime:       'audio/wav',
    voices: {
      female: 'af_heart',
      male:   'am_adam',
    },
  },
  piper: {
    port:       5005,
    voiceParam: 'speaker',
    ext:        'wav',
    mime:       'audio/wav',
    voices: {
      female: 'en_US-amy-medium',
      male:   'en_US-ryan-medium',
    },
  },
  xtts: {
    port:       5002,
    voiceParam: 'speaker',
    ext:        'wav',
    mime:       'audio/wav',
    voices: {
      female: 'Claribel Dervla',
      male:   'Craig Gutsy',
    },
  },
  elevenlabs: {
    provider:   'elevenlabs',
    healthCheck: false,
    ext:        'mp3',
    mime:       'audio/mpeg',
    voices: {
      female: ELEVENLABS_VOICE_ID_FEMALE,
      male:   ELEVENLABS_VOICE_ID_MALE,
    },
  },
};

// Pre-build cache file paths: tts_<engine>_<slot>.<ext>
const CACHE_FILES = {};
for (const [engine, cfg] of Object.entries(SERVER_ENGINES)) {
  CACHE_FILES[engine] = [0, 1].map(
    i => (FileSystem.cacheDirectory ?? '') + `tts_${engine}_${i}.${cfg.ext}`
  );
}

const HEALTH_INTERVAL_MS = 8000;

class TtsService {
  constructor() {
    this._ready    = false;
    this._speaking = false;
    this._queue    = [];
    this._busy     = false;
    this._listeners = {};

    this._engine   = 'native';
    this._preferredEngine = 'native';
    this._healthEngine    = 'native';
    this._gender   = 'female';

    // native
    this._nativeVoiceId = null;

    // server engines
    this._healthTimer    = null;
    this._healthFailures = 0;
    this._sound          = null;
    this._speakingTimer  = null;
    this._slot           = 0;
    this._prefetch       = null;
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  startHealthChecks() {
    tlog(`[MoodGluco][TTS] startHealthChecks engine=${this._engine} host=${LOCAL_HOST}`);
    this._boot();
  }

  stopHealthChecks() {
    if (this._healthTimer) { clearInterval(this._healthTimer); this._healthTimer = null; }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  isReady()    { return this._ready; }
  isSpeaking() { return this._speaking; }

  setEngine(engine) {
    const next = SERVER_ENGINES[engine] ? engine : 'native';
    tlog(`[MoodGluco][TTS] setEngine ${this._engine} -> ${next}`);
    if (this._preferredEngine === next && this._engine === next && this._ready) return;
    this._preferredEngine = next;
    this._healthEngine    = next;
    this.stop();
    this._engine         = next;
    this._ready          = false;
    this._healthFailures = 0;
    this.stopHealthChecks();
    this._boot();
  }

  setGender(gender) {
    this._gender = gender === 'male' ? 'male' : 'female';
    if (this._engine === 'native') this._resolveNativeVoice();
  }

  speak(text) {
    if (!text?.trim()) return;
    tlog(`[MoodGluco][TTS] speak queued engine=${this._engine} ready=${this._ready} speaking=${this._speaking} len=${text.trim().length}`);
    this._queue.push(text.trim());
    this._drain();
  }

  stop() {
    this._queue    = [];
    this._busy     = false;
    this._prefetch = null;
    if (this._speakingTimer) { clearTimeout(this._speakingTimer); this._speakingTimer = null; }
    if (this._engine === 'native') {
      Speech.stop();
    } else {
      if (this._sound) { try { this._sound.stopAsync(); } catch {} }
    }
    if (this._speaking) { this._speaking = false; this._emit('speaking', false); }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  _boot() {
    if (this._engine === 'native') {
      this._markReady();
      this._resolveNativeVoice();
      if (
        this._healthEngine
        && SERVER_ENGINES[this._healthEngine]
        && SERVER_ENGINES[this._healthEngine].healthCheck !== false
      ) {
        this._startHealthPolling(this._healthEngine);
      }
    } else {
      const cfg = SERVER_ENGINES[this._engine];
      if (cfg?.healthCheck === false) {
        this._markReady();
      } else {
        this._startHealthPolling(this._engine);
      }
    }
  }

  _startHealthPolling(engine) {
    if (!SERVER_ENGINES[engine] || !SERVER_ENGINES[engine].port) return;
    this._healthEngine = engine;
    tlog(`[MoodGluco][TTS] boot poll engine=${engine} url=http://${LOCAL_HOST}:${SERVER_ENGINES[engine]?.port}/health`);
    this._pollServerHealth();
    if (this._healthTimer) clearInterval(this._healthTimer);
    this._healthTimer = setInterval(() => this._pollServerHealth(), HEALTH_INTERVAL_MS);
  }

  _markReady() {
    if (!this._ready) {
      this._ready = true;
      tlog(`[MoodGluco][TTS] ready engine=${this._engine} host=${LOCAL_HOST}`);
      this._emit('ready');
      this._drain();
    }
  }

  _fallbackToNative(reason) {
    if (this._engine === 'native') return;
    tlog(`[MoodGluco][TTS] fallback to native reason=${reason} queue=${this._queue.length} preferred=${this._preferredEngine}`);

    if (this._speakingTimer) { clearTimeout(this._speakingTimer); this._speakingTimer = null; }
    if (this._sound) {
      try { this._sound.unloadAsync(); } catch {}
      this._sound = null;
    }

    this._engine         = 'native';
    this._ready          = true;
    this._healthFailures = 0;
    this._busy           = false;
    this._speaking       = false;
    this._emit('speaking', false);
    this._emit('ready');
    this._resolveNativeVoice();
    this._drain();
    this._emit('error', `${reason}-fallback-native`);
    this._startHealthPolling(this._healthEngine);
  }

  // ─── Server health check ──────────────────────────────────────────────────

  async _pollServerHealth() {
    const port = SERVER_ENGINES[this._engine]?.port;
    if (!port) return;
    try {
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 3000);
      const res  = await fetch(`http://${LOCAL_HOST}:${port}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        this._healthFailures = 0;
        tlog(`[MoodGluco][TTS] health ok engine=${this._healthEngine} url=http://${LOCAL_HOST}:${port}/health`);
        if (this._engine !== this._healthEngine) {
          this._engine = this._healthEngine;
          this._ready = false;
        }
        this._markReady();
      } else {
        tlog(`[MoodGluco][TTS] health bad engine=${this._healthEngine} status=${res.status}`);
      }
    } catch {
      this._healthFailures++;
      tlog(`[MoodGluco][TTS] health fail engine=${this._healthEngine} failures=${this._healthFailures} host=${LOCAL_HOST}`);
      if (this._engine !== 'native' && this._healthFailures >= 2) {
        this._fallbackToNative('health-failed');
        return;
      }
      if (this._ready && this._healthFailures >= 3) {
        this._ready = false;
        this._emit('error', `${this._healthEngine}-unreachable`);
      }
    }
  }

  // ─── Native engine ────────────────────────────────────────────────────────

  async _resolveNativeVoice() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const names  = this._gender === 'male' ? NATIVE_MALE_NAMES : NATIVE_FEMALE_NAMES;
      const match  = voices.find(
        v => v.language?.startsWith('en') && names.some(n => v.name?.toLowerCase().includes(n))
      );
      this._nativeVoiceId = match?.identifier ?? null;
    } catch {
      this._nativeVoiceId = null;
    }
  }

  _drainNative() {
    const text    = this._queue.shift();
    const profile = NATIVE_PROFILES[this._gender];

    tlog(`[MoodGluco][TTS] drain native len=${text?.length || 0}`);
    this._speaking = true;
    this._emit('speaking', true);

    Speech.speak(text, {
      ...(this._nativeVoiceId ? { voice: this._nativeVoiceId } : {}),
      pitch: profile.pitch,
      rate:  profile.rate,
      onDone:    () => this._onNativeDone(),
      onStopped: () => this._onNativeDone(),
      onError:   () => this._onNativeDone(),
    });
  }

  _onNativeDone() {
    this._busy = false;
    if (this._queue.length) {
      this._drain();
    } else {
      this._speaking = false;
      this._emit('speaking', false);
    }
  }

  // ─── Server engine (edge / kokoro / piper / xtts) ────────────────────────

  async _drainServer() {
    const text    = this._queue.shift();
    const curSlot = this._slot;
    const nxtSlot = 1 - curSlot;
    const cfg     = SERVER_ENGINES[this._engine];

    try {
      tlog(`[MoodGluco][TTS] drain server engine=${this._engine} ready=${this._ready} text_len=${text?.length || 0}`);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });

      // Use prefetch if it matches, otherwise synthesize fresh
      let uri;
      if (this._prefetch?.text === text) {
        try { uri = await this._prefetch.promise; } catch {}
      }
      this._prefetch = null;
      if (!uri) {
        if (cfg.port) {
          tlog(`[MoodGluco][TTS] fetch server engine=${this._engine} url=http://${LOCAL_HOST}:${cfg.port}/api/tts`);
        } else {
          tlog(`[MoodGluco][TTS] fetch server engine=${this._engine} provider=${cfg.provider || 'local'}`);
        }
        uri = await this._fetchServer(text, cfg, CACHE_FILES[this._engine][curSlot]);
      }

      if (this._sound) { try { await this._sound.unloadAsync(); } catch {} this._sound = null; }

      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
      this._sound = sound;
      sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish) this._onServerDone(sound); });

      this._speaking = true;
      tlog(`[MoodGluco][TTS] play start engine=${this._engine}`);
      this._emit('speaking', true);
      await sound.playAsync();

      // Prefetch next sentence while this one plays
      if (this._queue.length) {
        const nextText = this._queue[0];
        this._slot     = nxtSlot;
        this._prefetch = {
          text:    nextText,
          promise: this._fetchServer(nextText, cfg, CACHE_FILES[this._engine][nxtSlot]).catch(() => null),
        };
      }

      try {
        const st = await sound.getStatusAsync();
        if (st.isLoaded && st.durationMillis) {
          if (this._speakingTimer) clearTimeout(this._speakingTimer);
          this._speakingTimer = setTimeout(() => this._onServerDone(sound), st.durationMillis);
        }
      } catch {}
    } catch (e) {
      console.warn(`[TTS/${this._engine}]`, e.message);
      tlog(`[MoodGluco][TTS] server error engine=${this._engine} msg=${e.message}`);
      this._speaking = false;
      this._emit('speaking', false);
      this._busy = false;
      this._drain();
    }
  }

  async _fetchServer(text, cfg, cachePath) {
    if (cfg.provider === 'elevenlabs') {
      const voiceId = cfg.voices[this._gender];
      if (!ELEVENLABS_API_KEY) {
        throw new Error('Missing EXPO_PUBLIC_ELEVENLABS_API_KEY');
      }
      if (!voiceId) {
        throw new Error(`Missing ElevenLabs voice for gender ${this._gender}`);
      }

      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.85,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`ElevenLabs ${res.status}: ${errText || 'request failed'}`);
      }

      const audioBuffer = await res.arrayBuffer();
      const audioB64 = Buffer.from(audioBuffer).toString('base64');
      await FileSystem.writeAsStringAsync(cachePath, audioB64, { encoding: FileSystem.EncodingType.Base64 });
      return cachePath;
    }

    const voice  = cfg.voices[this._gender];
    const params = new URLSearchParams({ text, [cfg.voiceParam]: voice, language: 'en' });
    const url    = `http://${LOCAL_HOST}:${cfg.port}/api/tts?${params}`;
    await FileSystem.downloadAsync(url, cachePath);
    return cachePath;
  }

  _onServerDone(sound) {
    if (this._speakingTimer) { clearTimeout(this._speakingTimer); this._speakingTimer = null; }
    if (!this._speaking && !this._busy) return;
    this._speaking = false;
    this._emit('speaking', false);
    this._busy = false;
    sound.unloadAsync().catch(() => {});
    if (this._sound === sound) this._sound = null;
    this._drain();
  }

  // ─── Drain ────────────────────────────────────────────────────────────────

  _drain() {
    if (this._busy || !this._queue.length || !this._ready) return;
    this._busy = true;
    if (this._engine === 'native') {
      this._drainNative();
    } else {
      this._drainServer();
    }
  }

  // ─── Event bus ────────────────────────────────────────────────────────────

  on(event, cb) {
    (this._listeners[event] ??= []).push(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    this._listeners[event] = (this._listeners[event] || []).filter(l => l !== cb);
  }

  _emit(event, ...args) {
    (this._listeners[event] || []).forEach(cb => cb(...args));
  }
}

export default new TtsService();
