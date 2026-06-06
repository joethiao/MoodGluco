#!/usr/bin/env python3
"""
XTTS v2 Flask server for MoodGluco
-----------------------------------
Endpoint : GET /api/tts?text=<text>&language=<lang>
           Returns : WAV audio (audio/wav)
Health   : GET /health  → {"status":"ok","model":"xtts_v2"}
Port     : 5002

Model weights are read from the Coqui TTS cache:
  ~/Library/Application Support/tts/tts_models--multilingual--multi-dataset--xtts_v2/
"""

import io
import os
import sys
import logging
import threading

# Patch torch.load BEFORE importing TTS: PyTorch 2.6 changed the default of
# weights_only from False to True, which breaks Coqui TTS checkpoint loading.
import torch as _torch
_orig_torch_load = _torch.load
def _patched_torch_load(f, map_location=None, pickle_module=None, weights_only=False, **kwargs):
    return _orig_torch_load(f, map_location=map_location, pickle_module=pickle_module, weights_only=weights_only, **kwargs)
_torch.load = _patched_torch_load

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO, format="[XTTS] %(message)s")
log = logging.getLogger(__name__)

# ── Locate model weights ───────────────────────────────────────────────────────
CACHE_DIR = os.path.expanduser(
    "~/Library/Application Support/tts/tts_models--multilingual--multi-dataset--xtts_v2"
)
MODEL_PATH  = os.path.join(CACHE_DIR, "model.pth")
CONFIG_PATH = os.path.join(CACHE_DIR, "config.json")
VOCAB_PATH  = os.path.join(CACHE_DIR, "vocab.json")

for p in [MODEL_PATH, CONFIG_PATH]:
    if not os.path.exists(p):
        log.error(f"Missing file: {p}")
        log.error("Run: tts --model_name tts_models/multilingual/multi-dataset/xtts_v2 --list_speaker_idxs")
        sys.exit(1)

# ── Load model (once at startup) ──────────────────────────────────────────────
os.environ.setdefault("COQUI_TOS_AGREED", "1")

log.info("Loading XTTS v2 model (first run may take ~30s)…")
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

config = XttsConfig()
config.load_json(CONFIG_PATH)
model = Xtts.init_from_config(config)
model.load_checkpoint(config, checkpoint_dir=CACHE_DIR, eval=True)
model.cpu()          # CPU inference — works on any Mac without GPU
log.info("Model loaded ✓")
_inference_lock = threading.Lock()

# Load a built-in speaker embedding from speakers_xtts.pth
SPEAKERS_PATH = os.path.join(CACHE_DIR, "speakers_xtts.pth")
_speakers = _orig_torch_load(SPEAKERS_PATH, map_location="cpu", weights_only=False)
# Pick the first available speaker
_first_speaker = next(iter(_speakers.values()))
SPEAKER_GPTS  = _first_speaker["gpt_cond_latent"]
SPEAKER_EMBED = _first_speaker["speaker_embedding"]
log.info(f"Using built-in speaker: {next(iter(_speakers.keys()))}")

# ── Warmup inference (so first real request is fast) ──────────────────────────
log.info("Warming up model…")
try:
    with _inference_lock:
        _warm = model.inference(
            text="Hello.",
            language="en",
            gpt_cond_latent=SPEAKER_GPTS,
            speaker_embedding=SPEAKER_EMBED,
            temperature=0.7,
        )
    log.info("Warmup done ✓")
except Exception as _e:
    log.warning(f"Warmup failed (non-fatal): {_e}")

# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)   # allow requests from Metro / RN on any origin

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": "xtts_v2"})

@app.route("/api/speakers")
def speakers():
    return jsonify({"speakers": sorted(_speakers.keys())})

@app.route("/api/tts")
def tts():
    text     = request.args.get("text", "").strip()
    language = request.args.get("language", "en").strip()
    speaker  = request.args.get("speaker", "").strip()

    if not text:
        return jsonify({"error": "text is required"}), 400

    # Clamp language to XTTS supported list
    SUPPORTED = {"en","es","fr","de","it","pt","pl","tr","ru","nl","cs","ar","zh-cn","hu","ko","ja","hi"}
    if language not in SUPPORTED:
        language = "en"

    log.info(f"Synthesising [{language}] speaker=[{speaker or 'default'}] '{text[:60]}{'…' if len(text)>60 else ''}'")

    # Resolve speaker embeddings
    if speaker and speaker in _speakers:
        sp = _speakers[speaker]
        gpt_cond  = sp["gpt_cond_latent"]
        spk_embed = sp["speaker_embedding"]
    else:
        gpt_cond  = SPEAKER_GPTS
        spk_embed = SPEAKER_EMBED

    try:
        with _inference_lock:
            out = model.inference(
                text=text,
                language=language,
                gpt_cond_latent=gpt_cond,
                speaker_embedding=spk_embed,
                temperature=0.7,
                repetition_penalty=10.0,
                top_k=50,
                top_p=0.85,
                enable_text_splitting=True,
            )
    except Exception as e:
        log.error(f"Inference error: {e}")
        return jsonify({"error": str(e)}), 500

    # Write PCM samples to in-memory WAV
    import wave
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)          # 16-bit
        wf.setframerate(24000)      # XTTS output sample rate
        import numpy as np
        pcm = (np.array(out["wav"]) * 32767).astype(np.int16)
        wf.writeframes(pcm.tobytes())
    buf.seek(0)

    return send_file(buf, mimetype="audio/wav", as_attachment=False)


if __name__ == "__main__":
    port = int(os.environ.get("XTTS_PORT", 5002))
    log.info(f"XTTS server listening on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, threaded=True)
