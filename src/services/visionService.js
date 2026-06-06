/**
 * visionService — Face & mood analysis (MediaPipe + DeepFace + RetinaFace).
 *
 * - Analyzes a camera frame or base64 image every ANALYSIS_INTERVAL ms
 * - Only updates moodContext when a face is actually detected
 * - Clears moodContext after CONTEXT_TTL ms of no face detected
 *
 * Events: 'ready' | 'result' | 'error'
 */

const HOST             = '127.0.0.1';
const VISION_ENDPOINT  = `http://${HOST}:5006`;
const HEALTH_INTERVAL  = 10000;
const CONTEXT_TTL      = 60000; // clear context after 60s without a face

class VisionService {
  constructor() {
    this._ready         = false;
    this._healthTimer   = null;
    this._contextTimer  = null;
    this._lastContext   = null;
    this._listeners     = {};
  }

  // ── Setup ───────────────────────────────────────────────────────────────────

  startHealthChecks() {
    this._checkHealth();
    this._healthTimer = setInterval(() => this._checkHealth(), HEALTH_INTERVAL);
  }

  stopHealthChecks() {
    if (this._healthTimer) { clearInterval(this._healthTimer); this._healthTimer = null; }
    if (this._contextTimer) { clearTimeout(this._contextTimer); this._contextTimer = null; }
  }

  isReady()      { return this._ready; }
  lastContext()  { return this._lastContext; }

  // ── Analyze ─────────────────────────────────────────────────────────────────

  /** Analyze from a <CameraView> ref (real device). */
  async analyzeFrame(cameraRef) {
    if (!this._ready || !cameraRef?.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5, base64: true, skipProcessing: true,
      });
      return this._send(photo?.base64);
    } catch (e) {
      console.warn('[Vision]', e.message);
      return null;
    }
  }

  /** Analyze from a raw base64 string (simulator / gallery image). */
  async analyzeBase64(base64) {
    return this._send(base64);
  }

  /** Transcribe an audio file (m4a/wav/mp3) via Whisper. Returns {text, language}. */
  async transcribeAudio(audioUri) {
    if (!audioUri) return null;
    try {
      const cleanUri = String(audioUri).split('?')[0];
      const extRaw = (cleanUri.split('.').pop() || 'm4a').toLowerCase();
      const ext = ['m4a', 'mp4', 'wav', 'mp3', 'aac', 'caf', 'webm', 'ogg'].includes(extRaw) ? extRaw : 'm4a';
      const mimeByExt = {
        m4a: 'audio/mp4',
        mp4: 'audio/mp4',
        wav: 'audio/wav',
        mp3: 'audio/mpeg',
        aac: 'audio/aac',
        caf: 'audio/x-caf',
        webm: 'audio/webm',
        ogg: 'audio/ogg',
      };
      const mime = mimeByExt[ext] || 'audio/mp4';

      const send = async (fieldName, name) => {
        const form = new FormData();
        form.append(fieldName, { uri: audioUri, name, type: mime });
        return fetch(`${VISION_ENDPOINT}/api/stt`, {
          method: 'POST',
          body: form,
        });
      };

      // Primary attempt expected by backend
      let res = await send('audio', `voice.${ext}`);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        // Fallback for device-specific multipart edge cases
        if (res.status === 400 && /audio file required/i.test(errText)) {
          res = await send('file', `voice.${ext}`);
        } else {
          throw new Error(`STT HTTP ${res.status}: ${errText}`);
        }
      }

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`STT HTTP ${res.status}: ${err}`);
      }

      return await res.json();
    } catch (e) {
      console.warn('[Vision/STT]', e.message);
      return null;
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  async _send(raw) {
    if (!this._ready || !raw) return null;
    const b64 = raw.replace(/^data:image\/\w+;base64,/, '').replace(/\s+/g, '');
    if (!b64) return null;

    try {
      const res = await fetch(`${VISION_ENDPOINT}/api/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: b64 }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => String(res.status));
        throw new Error(`Vision HTTP ${res.status}: ${err}`);
      }

      const data = await res.json();

      if (data.face_detected) {
        // Reset TTL timer and store context
        if (this._contextTimer) { clearTimeout(this._contextTimer); }
        this._lastContext = data.context;
        this._contextTimer = setTimeout(() => {
          this._lastContext = null;
        }, CONTEXT_TTL);
        this._emit('result', data);
      }
      // If no face: keep last context, don't reset

      return data;
    } catch (e) {
      console.warn('[Vision]', e.message);
      return null;
    }
  }

  async _checkHealth() {
    try {
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 3000);
      const res  = await fetch(`${VISION_ENDPOINT}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      const data  = await res.json();
      const ready = res.ok && data.status === 'ok';
      if (ready && !this._ready) { this._ready = true;  this._emit('ready'); }
      if (!ready && this._ready) { this._ready = false; }
    } catch {
      if (this._ready) { this._ready = false; this._emit('error', 'vision-unreachable'); }
    }
  }

  // ── Event bus ────────────────────────────────────────────────────────────────

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

export default new VisionService();
