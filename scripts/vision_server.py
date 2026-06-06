#!/usr/bin/env python3
"""
Face Analysis Server for MoodGluco — v2
-----------------------------------------
Pipeline:
  1. Image quality check      (Laplacian blur detection)
  2. MediaPipe FaceMesh       (468 landmarks → gaze, head pose, eye openness, brow)
  3. DeepFace + RetinaFace    (accurate face detection + 7-class emotion)
  4. Temporal smoothing       (rolling 4-frame window → stable emotion)
  5. Factual context builder  (medical-safe description + avatar hints)

Install: pip install deepface retina-face mediapipe opencv-python-headless==4.8.1.78
         numpy==1.26.4 tf-keras flask flask-cors pillow pillow-heif
Port   : 5006
"""

import base64
import io
import logging
import os
import sys
import threading
from collections import Counter, deque

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="[Vision] %(message)s")
log = logging.getLogger(__name__)

# ── Global state ──────────────────────────────────────────────────────────────
_deepface  = None
_face_mesh = None
_ready     = False
_emo_history = deque(maxlen=4)   # temporal smoothing window
_emo_lock    = threading.Lock()

# ── Model loader ──────────────────────────────────────────────────────────────

def _load_models():
    global _deepface, _face_mesh, _ready
    try:
        import mediapipe as mp
        log.info("Loading MediaPipe FaceMesh...")
        _face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
        log.info("MediaPipe ready ✓")

        from deepface import DeepFace
        _deepface = DeepFace
        log.info("Warming up DeepFace + RetinaFace (first run downloads weights ~50MB)...")
        dummy = np.zeros((100, 100, 3), dtype=np.uint8)
        try:
            DeepFace.analyze(dummy, actions=["emotion"],
                             enforce_detection=False,
                             detector_backend="retinaface",
                             silent=True)
        except Exception:
            pass
        log.info("DeepFace + RetinaFace ready ✓")
        _ready = True
        log.info("All models ready — face analysis active")
    except Exception as e:
        log.error(f"Model load failed: {e}", exc_info=True)
        sys.exit(1)

threading.Thread(target=_load_models, daemon=True).start()

# ── MediaPipe landmark indices ────────────────────────────────────────────────
_LM = {
    "nose":       4,   "forehead":  10,  "chin":       152,
    "l_ear":      234, "r_ear":     454,
    "l_eye_top":  159, "l_eye_bot": 145,
    "r_eye_top":  386, "r_eye_bot": 374,
    "l_iris":     468, "r_iris":    473,
    "l_brow_in":  55,  "r_brow_in": 285,
}

def _pt(lm, key, w, h):
    p = lm[_LM[key]]
    return np.array([p.x * w, p.y * h])

# ── Image quality check ───────────────────────────────────────────────────────

def _blur_score(img_gray: np.ndarray) -> float:
    return float(cv2.Laplacian(img_gray, cv2.CV_64F).var())

# ── MediaPipe analysis ────────────────────────────────────────────────────────

def _mesh_signals(img_rgb: np.ndarray) -> dict | None:
    h, w = img_rgb.shape[:2]
    res  = _face_mesh.process(img_rgb)
    if not res.multi_face_landmarks:
        return None

    lm = res.multi_face_landmarks[0].landmark
    g  = lambda k: _pt(lm, k, w, h)

    face_h = float(np.linalg.norm(g("forehead") - g("chin"))) or 1.0
    face_w = float(np.linalg.norm(g("l_ear")    - g("r_ear"))) or 1.0

    # Eye aspect ratio — openness proxy
    l_ear_v = float(np.linalg.norm(g("l_eye_top") - g("l_eye_bot")))
    r_ear_v = float(np.linalg.norm(g("r_eye_top") - g("r_eye_bot")))
    ear     = (l_ear_v + r_ear_v) / 2 / face_h

    # Brow furrow — inner-brow distance normalized
    brow_dist = float(np.linalg.norm(g("l_brow_in") - g("r_brow_in"))) / face_w

    # Head yaw (left/right)
    nose_x   = g("nose")[0]
    center_x = (g("l_ear")[0] + g("r_ear")[0]) / 2
    yaw      = float((nose_x - center_x) / face_w)

    # Head pitch (up/down) — normalized 0..1
    pitch = float((g("nose")[1] - g("forehead")[1]) / face_h)

    # Gaze offset (iris relative to eye centre)
    try:
        l_ecx = (g("l_eye_top")[0] + g("l_eye_bot")[0]) / 2
        r_ecx = (g("r_eye_top")[0] + g("r_eye_bot")[0]) / 2
        gaze  = (abs(lm[_LM["l_iris"]].x * w - l_ecx) +
                 abs(lm[_LM["r_iris"]].x * w - r_ecx)) / 2
        gaze /= (face_w * 0.08 + 1e-6)
    except Exception:
        gaze = 0.0

    return {"ear": ear, "brow_dist": brow_dist, "yaw": yaw,
            "pitch": pitch, "gaze": float(gaze)}

# ── DeepFace emotion ──────────────────────────────────────────────────────────

CONFIDENCE_THRESHOLD = 55.0   # % — below this we call it "undetermined"

def _emotion(img_bgr: np.ndarray) -> dict:
    # Try RetinaFace first (most accurate), fallback to opencv for edge cases
    for backend in ("retinaface", "opencv"):
        try:
            res = _deepface.analyze(
                img_bgr,
                actions=["emotion"],
                enforce_detection=True,
                detector_backend=backend,
                silent=True,
            )
            r      = res[0] if isinstance(res, list) else res
            dom    = r.get("dominant_emotion", "neutral")
            scores = r.get("emotion", {})
            top_v  = max(scores.values()) if scores else 0
            if backend == "opencv":
                log.debug("RetinaFace missed, opencv fallback succeeded")
            return {"dominant": dom, "scores": scores,
                    "face_found": True, "peak_conf": top_v}
        except ValueError:
            continue   # no face with this backend, try next
        except Exception as e:
            log.warning(f"DeepFace [{backend}]: {e}")
            continue

    return {"dominant": "unknown", "scores": {}, "face_found": False, "peak_conf": 0}

# ── Temporal smoothing ────────────────────────────────────────────────────────

def _smooth_emotion(dominant: str) -> str:
    with _emo_lock:
        _emo_history.append(dominant)
        return Counter(_emo_history).most_common(1)[0][0]

# ── Context / description builder ────────────────────────────────────────────

EMOTION_LABELS = {
    "happy":    "happy",    "sad":      "sad",
    "angry":    "angry",    "fear":     "anxious",
    "disgust":  "disgusted","surprise": "surprised",
    "neutral":  "neutral",
}

def _build_context(mesh: dict | None, em: dict, blur: float) -> dict:
    face_found = em.get("face_found", False)
    dominant   = em.get("dominant",   "unknown")
    scores     = em.get("scores",     {})
    peak_conf  = em.get("peak_conf",  0)

    # ── No face ──
    if not face_found:
        desc = "No human face detected in the current frame."
        return {"face_detected": False, "emotion": "unknown",
                "description": desc, "avatar_hint": "continue naturally",
                "context": f"[Vision] {desc}", "confidence": 0.0}

    # ── Image quality warning ──
    quality_note = ""
    if blur < 80:
        quality_note = " (image is blurry, analysis may be less accurate)"

    # ── Temporal smoothing ──
    smoothed = _smooth_emotion(dominant)

    # ── Confidence check ──
    top_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
    if peak_conf < CONFIDENCE_THRESHOLD:
        emotion_str = "neutral or undetermined"
        emotion_key = "neutral"
    else:
        emotion_key = smoothed
        emotion_str = EMOTION_LABELS.get(smoothed, smoothed)

    conf_pct = round(peak_conf)
    score_detail = ", ".join(
        f"{EMOTION_LABELS.get(k, k)} {round(v)}%"
        for k, v in top_scores if v > 8
    )

    # ── Head orientation ──
    orientation_parts = []
    if mesh:
        if abs(mesh["yaw"]) > 0.25:
            side = "right" if mesh["yaw"] > 0 else "left"
            orientation_parts.append(f"head turned to the {side}")
        elif abs(mesh["yaw"]) > 0.12:
            side = "right" if mesh["yaw"] > 0 else "left"
            orientation_parts.append(f"head slightly turned {side}")

        if mesh["pitch"] > 0.70:
            orientation_parts.append("head tilted down")
        elif mesh["pitch"] < 0.30:
            orientation_parts.append("head tilted up")

        # Gaze
        if mesh["gaze"] > 2.0:
            orientation_parts.append("gaze directed away from camera")
        elif mesh["gaze"] < 0.8:
            orientation_parts.append("gaze directed at camera")

        # Eye openness
        if mesh["ear"] < 0.09:
            orientation_parts.append("eyes nearly closed")
        elif mesh["ear"] < 0.13:
            orientation_parts.append("eyes partially closed")

        # Brow
        if mesh["brow_dist"] < 0.22:
            orientation_parts.append("brow furrowed")

    orientation_str = (". " + "; ".join(orientation_parts).capitalize() + ".") \
                      if orientation_parts else "."

    description = (
        f"The person appears {emotion_str} (scores: {score_detail})"
        f"{orientation_str}{quality_note}"
    )

    # ── Avatar hints (factual, medical-safe) ──
    hints = []
    if emotion_key in ("fear", "angry") and peak_conf > 50:
        hints.append("speak calmly and reassure")
    if emotion_key == "sad" and peak_conf > 50:
        hints.append("be empathetic and gentle")
    if emotion_key == "happy" and peak_conf > 60:
        hints.append("match positive energy")
    if emotion_key == "surprise":
        hints.append("check if the user has a question or needs clarification")
    if mesh and mesh["gaze"] > 2.0:
        hints.append("user may be distracted, gently re-engage")
    if mesh and mesh["ear"] < 0.10:
        hints.append("user may be tired, keep response brief")
    hint_str = "; ".join(hints) if hints else "continue naturally"

    return {
        "face_detected": True,
        "emotion":       emotion_key,
        "confidence":    round(peak_conf / 100, 2),
        "description":   description,
        "avatar_hint":   hint_str,
        "context":       f"[Vision] {description} Hint: {hint_str}",
    }

# ── Image decode + resize ─────────────────────────────────────────────────────

def _decode(b64: str):
    raw     = base64.b64decode(b64)
    img_pil = Image.open(io.BytesIO(raw)).convert("RGB")
    w, h    = img_pil.size
    if max(w, h) > 640:
        s = 640 / max(w, h)
        img_pil = img_pil.resize((int(w * s), int(h * s)), Image.LANCZOS)
    img_rgb  = np.array(img_pil)
    img_bgr  = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    return img_rgb, img_bgr, img_gray

# ── Flask ─────────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

# ── Speech-to-Text (Whisper) ──────────────────────────────────────────────────
_whisper = None
_whisper_lock = threading.Lock()

def _get_whisper():
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel
        log.info("Loading Whisper 'base' model (first run downloads ~140MB)...")
        _whisper = WhisperModel("base", device="cpu", compute_type="int8")
        log.info("Whisper ready ✓")
    return _whisper

@app.route("/api/stt", methods=["POST"])
def stt():
    audio_file = (
        request.files.get('audio')
        or request.files.get('file')
        or request.files.get('voice')
    )
    if audio_file is None:
        return jsonify({"error": "audio file required (multipart field 'audio'|'file'|'voice')"}), 400

    import tempfile, os as _os
    suffix = '.' + (audio_file.filename.rsplit('.', 1)[-1] if '.' in audio_file.filename else 'm4a')
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_file.read())
        tmp_path = tmp.name

    try:
        with _whisper_lock:
            model = _get_whisper()
            segments, info = model.transcribe(
                tmp_path,
                beam_size=3,
                no_speech_threshold=0.6,             # reject silence/noise more aggressively
                condition_on_previous_text=False,    # avoid hallucination loops
                vad_filter=True,                     # built-in voice activity detection
                vad_parameters={"min_silence_duration_ms": 500},
            )
            # Filter low-confidence / no-speech segments
            kept = []
            for seg in segments:
                if getattr(seg, "no_speech_prob", 0) > 0.6:
                    continue
                if getattr(seg, "avg_logprob", 0) < -1.0:
                    continue
                kept.append(seg.text.strip())
            text = " ".join(kept).strip()
        log.info(f"STT [{info.language}]: '{text[:80]}'")
        return jsonify({"text": text, "language": info.language})
    except Exception as e:
        log.error(f"STT error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        try: _os.unlink(tmp_path)
        except Exception: pass

@app.route("/health")
def health():
    return jsonify({"status": "ok" if _ready else "loading",
                    "engine": "mediapipe+deepface+retinaface"})

@app.route("/api/analyze", methods=["POST"])
def analyze():
    if not _ready:
        return jsonify({"error": "Models loading, please wait"}), 503

    data    = request.get_json(silent=True) or {}
    img_b64 = data.get("image", "").strip()
    if not img_b64:
        return jsonify({"error": "image (base64) required"}), 400
    if "," in img_b64:
        img_b64 = img_b64.split(",", 1)[1]

    try:
        img_rgb, img_bgr, img_gray = _decode(img_b64)
    except Exception as e:
        return jsonify({"error": f"Cannot decode image: {e}"}), 400

    try:
        blur   = _blur_score(img_gray)
        mesh   = _mesh_signals(img_rgb)
        em     = _emotion(img_bgr)
        result = _build_context(mesh, em, blur)
        log.info(
            f"face={result['face_detected']} "
            f"emotion={result['emotion']} "
            f"conf={result['confidence']:.2f} "
            f"blur={blur:.0f} "
            f"hint={result['avatar_hint'][:40]}"
        )
        return jsonify(result)
    except Exception as e:
        log.error(f"Analysis error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("FACE_ANALYSIS_PORT", 5006))
    log.info(f"Face Analysis server on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, threaded=True)
