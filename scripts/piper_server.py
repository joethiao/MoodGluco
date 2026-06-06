#!/usr/bin/env python3
"""
Piper TTS server for MoodGluco
Install: pip install piper-tts flask flask-cors numpy huggingface_hub
Port: 5005
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
    from piper.voice import PiperVoice
    from huggingface_hub import hf_hub_download
except ImportError as e:
    print(f"ERROR: Missing dependency: {e}")
    print("Run: pip install piper-tts numpy flask flask-cors huggingface_hub")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="[Piper] %(message)s")
log = logging.getLogger(__name__)

# Voice catalogue: (hf_repo, onnx_filename, json_filename)
VOICES_CONFIG = {
    "en_US-ryan-medium": {
        "lang": "en", "gender": "male", "label": "Ryan (EN-US)",
        "repo": "rhasspy/piper-voices",
        "onnx": "en/en_US/ryan/medium/en_US-ryan-medium.onnx",
        "json": "en/en_US/ryan/medium/en_US-ryan-medium.onnx.json",
    },
    "en_US-amy-medium": {
        "lang": "en", "gender": "female", "label": "Amy (EN-US)",
        "repo": "rhasspy/piper-voices",
        "onnx": "en/en_US/amy/medium/en_US-amy-medium.onnx",
        "json": "en/en_US/amy/medium/en_US-amy-medium.onnx.json",
    },
    "en_GB-alan-medium": {
        "lang": "en", "gender": "male", "label": "Alan (EN-GB)",
        "repo": "rhasspy/piper-voices",
        "onnx": "en/en_GB/alan/medium/en_GB-alan-medium.onnx",
        "json": "en/en_GB/alan/medium/en_GB-alan-medium.onnx.json",
    },
    "fr_FR-siwis-medium": {
        "lang": "fr", "gender": "female", "label": "Siwis (FR)",
        "repo": "rhasspy/piper-voices",
        "onnx": "fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx",
        "json": "fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json",
    },
    "fr_FR-upmc-medium": {
        "lang": "fr", "gender": "male", "label": "UPMC (FR)",
        "repo": "rhasspy/piper-voices",
        "onnx": "fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx",
        "json": "fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx.json",
    },
}

DEFAULT_VOICE_MALE   = "en_US-ryan-medium"
DEFAULT_VOICE_FEMALE = "en_US-amy-medium"

_voice_cache: dict = {}
_lock = threading.Lock()


def get_voice(name: str) -> PiperVoice:
    if name in _voice_cache:
        return _voice_cache[name]

    cfg = VOICES_CONFIG[name]
    log.info(f"Downloading voice '{name}' from HuggingFace...")
    try:
        onnx_path = hf_hub_download(repo_id=cfg["repo"], filename=cfg["onnx"])
        json_path = hf_hub_download(repo_id=cfg["repo"], filename=cfg["json"])
    except Exception as e:
        log.error(f"Download failed for '{name}': {e}")
        raise

    voice = PiperVoice.load(onnx_path, config_path=json_path, use_cuda=False)
    _voice_cache[name] = voice
    log.info(f"Voice '{name}' ready")
    return voice


# Pre-load default voices at startup
for default in (DEFAULT_VOICE_MALE, DEFAULT_VOICE_FEMALE):
    try:
        get_voice(default)
    except Exception as e:
        log.warning(f"Could not pre-load '{default}': {e}")

app = Flask(__name__)
CORS(app)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "engine": "piper", "loaded": list(_voice_cache.keys())})


@app.route("/api/voices")
def list_voices():
    return jsonify({k: {kk: vv for kk, vv in v.items() if kk in ("lang", "gender", "label")}
                    for k, v in VOICES_CONFIG.items()})


@app.route("/api/tts")
def tts():
    text    = request.args.get("text", "").strip()
    speaker = request.args.get("speaker", DEFAULT_VOICE_MALE).strip()

    if not text:
        return jsonify({"error": "text is required"}), 400
    if speaker not in VOICES_CONFIG:
        speaker = DEFAULT_VOICE_MALE

    log.info(f"[{speaker}] '{text[:60]}{'...' if len(text) > 60 else ''}'")

    try:
        voice = get_voice(speaker)
        buf = io.BytesIO()
        with _lock:
            with wave.open(buf, "wb") as wf:
                voice.synthesize(text, wf)
        buf.seek(0)
    except Exception as e:
        log.error(f"Synthesis error: {e}")
        return jsonify({"error": str(e)}), 500

    return send_file(buf, mimetype="audio/wav", as_attachment=False)


if __name__ == "__main__":
    port = int(os.environ.get("PIPER_PORT", 5005))
    log.info(f"Piper server on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, threaded=True)
