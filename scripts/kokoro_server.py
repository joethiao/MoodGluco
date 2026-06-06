#!/usr/bin/env python3
"""
Kokoro TTS server for MoodGluco
Install: pip install kokoro-onnx soundfile flask flask-cors numpy huggingface_hub
Port: 5004
"""

import io
import wave
import logging
import threading
import os
import sys
from pathlib import Path

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

try:
    import numpy as np
    from kokoro_onnx import Kokoro
except ImportError as e:
    print(f"ERROR: Missing dependency: {e}")
    print("Run: pip install kokoro-onnx numpy flask flask-cors huggingface_hub")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="[Kokoro] %(message)s")
log = logging.getLogger(__name__)

VOICES = {
    "am_adam":     {"lang": "en", "gender": "male",   "label": "Adam (EN-US)"},
    "am_michael":  {"lang": "en", "gender": "male",   "label": "Michael (EN-US)"},
    "af_heart":    {"lang": "en", "gender": "female", "label": "Heart (EN-US)"},
    "af_bella":    {"lang": "en", "gender": "female", "label": "Bella (EN-US)"},
    "af_sarah":    {"lang": "en", "gender": "female", "label": "Sarah (EN-US)"},
    "bm_george":   {"lang": "en", "gender": "male",   "label": "George (EN-GB)"},
    "bm_lewis":    {"lang": "en", "gender": "male",   "label": "Lewis (EN-GB)"},
    "bf_emma":     {"lang": "en", "gender": "female", "label": "Emma (EN-GB)"},
    "bf_isabella": {"lang": "en", "gender": "female", "label": "Isabella (EN-GB)"},
    "ff_siwis":    {"lang": "fr", "gender": "female", "label": "Siwis (FR)"},
}

DEFAULT_VOICE_MALE   = "am_adam"
DEFAULT_VOICE_FEMALE = "af_heart"

# Download model files from GitHub releases on first run (~160MB for int8)
MODELS_DIR = Path(__file__).parent / "kokoro_models"
MODELS_DIR.mkdir(exist_ok=True)

MODEL_URL  = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx"
VOICES_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
MODEL_PATH  = MODELS_DIR / "kokoro-v1.0.int8.onnx"
VOICES_PATH = MODELS_DIR / "voices-v1.0.bin"


def download_if_missing(path: Path, url: str):
    if path.exists():
        log.info(f"Found cached: {path.name} ({path.stat().st_size / 1e6:.1f}MB)")
        return
    log.info(f"Downloading {path.name} ...")
    import urllib.request
    urllib.request.urlretrieve(url, path)
    log.info(f"Downloaded {path.name} ({path.stat().st_size / 1e6:.1f}MB)")


log.info("Loading Kokoro model (downloads ~160MB on first run)...")
try:
    download_if_missing(MODEL_PATH,  MODEL_URL)
    download_if_missing(VOICES_PATH, VOICES_URL)
    kokoro = Kokoro(str(MODEL_PATH), str(VOICES_PATH))
    log.info("Kokoro loaded OK")
except Exception as e:
    log.error(f"Failed to load Kokoro: {e}")
    sys.exit(1)

_lock = threading.Lock()
app = Flask(__name__)
CORS(app)


def pcm_to_wav(samples, sample_rate: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        pcm = (np.clip(np.array(samples), -1.0, 1.0) * 32767).astype(np.int16)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


@app.route("/health")
def health():
    return jsonify({"status": "ok", "engine": "kokoro"})


@app.route("/api/voices")
def list_voices():
    return jsonify(VOICES)


@app.route("/api/tts")
def tts():
    text  = request.args.get("text", "").strip()
    voice = request.args.get("voice", DEFAULT_VOICE_MALE).strip()
    speed = float(request.args.get("speed", "1.0"))

    if not text:
        return jsonify({"error": "text is required"}), 400
    if voice not in VOICES:
        voice = DEFAULT_VOICE_MALE

    log.info(f"[{voice}] '{text[:60]}{'...' if len(text) > 60 else ''}'")

    try:
        with _lock:
            samples, sample_rate = kokoro.create(text, voice=voice, speed=speed, lang="en-us")
        wav = pcm_to_wav(samples, sample_rate)
    except Exception as e:
        log.error(f"Synthesis error: {e}")
        return jsonify({"error": str(e)}), 500

    return send_file(io.BytesIO(wav), mimetype="audio/wav", as_attachment=False)


if __name__ == "__main__":
    port = int(os.environ.get("KOKORO_PORT", 5004))
    log.info(f"Kokoro server on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, threaded=True)
