#!/usr/bin/env python3
"""
Edge TTS server for MoodGluco
-------------------------------
Uses Microsoft Edge's neural TTS voices — free, no API key required.

Install deps (once):
  pip install edge-tts flask flask-cors

Endpoint : GET /api/tts?text=<text>&voice=<voice>  → audio/mpeg (MP3)
Voices   : GET /api/voices                         → list all voices
Health   : GET /health                             → {"status":"ok","engine":"edge-tts"}
Port     : 5003
"""

import io
import asyncio
import logging
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

try:
    import edge_tts
except ImportError:
    print("ERROR: edge-tts not installed. Run: pip install edge-tts")
    raise

logging.basicConfig(level=logging.INFO, format="[EdgeTTS] %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── Voice catalogue (curated selection) ───────────────────────────────────────
VOICES = {
    # English
    "en-US-AndrewNeural":    {"lang": "en", "gender": "male",   "label": "Andrew (EN)"},
    "en-US-BrianNeural":     {"lang": "en", "gender": "male",   "label": "Brian (EN)"},
    "en-US-GuyNeural":       {"lang": "en", "gender": "male",   "label": "Guy (EN)"},
    "en-US-JennyNeural":     {"lang": "en", "gender": "female", "label": "Jenny (EN)"},
    "en-US-AriaNeural":      {"lang": "en", "gender": "female", "label": "Aria (EN)"},
    "en-GB-RyanNeural":      {"lang": "en", "gender": "male",   "label": "Ryan (EN-GB)"},
    "en-GB-SoniaNeural":     {"lang": "en", "gender": "female", "label": "Sonia (EN-GB)"},
    # French
    "fr-FR-HenriNeural":     {"lang": "fr", "gender": "male",   "label": "Henri (FR)"},
    "fr-FR-DeniseNeural":    {"lang": "fr", "gender": "female", "label": "Denise (FR)"},
    "fr-FR-EloiseNeural":    {"lang": "fr", "gender": "female", "label": "Eloise (FR)"},
    "fr-CA-AntoineNeural":   {"lang": "fr", "gender": "male",   "label": "Antoine (FR-CA)"},
}

DEFAULT_VOICE_MALE   = "en-US-AndrewNeural"
DEFAULT_VOICE_FEMALE = "en-US-JennyNeural"


async def _synthesize(text: str, voice: str) -> bytes:
    """Synthesize text and return raw MP3 bytes."""
    buf = io.BytesIO()
    communicate = edge_tts.Communicate(text, voice)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()


@app.route("/health")
def health():
    return jsonify({"status": "ok", "engine": "edge-tts"})


@app.route("/api/voices")
def voices():
    return jsonify(VOICES)


@app.route("/api/tts")
def tts():
    text  = request.args.get("text", "").strip()
    voice = request.args.get("voice", DEFAULT_VOICE_MALE).strip()

    if not text:
        return jsonify({"error": "text is required"}), 400

    if voice not in VOICES:
        voice = DEFAULT_VOICE_MALE
        log.warning(f"Unknown voice, falling back to {voice}")

    log.info(f"Synthesising [{voice}] '{text[:60]}{'…' if len(text) > 60 else ''}'")

    try:
        audio_bytes = asyncio.run(_synthesize(text, voice))
    except Exception as e:
        log.error(f"Synthesis error: {e}")
        return jsonify({"error": str(e)}), 500

    return send_file(
        io.BytesIO(audio_bytes),
        mimetype="audio/mpeg",
        as_attachment=False,
    )


if __name__ == "__main__":
    import os
    port = int(os.environ.get("EDGE_TTS_PORT", 5003))
    log.info(f"Edge TTS server listening on http://0.0.0.0:{port}")
    log.info(f"Available voices: {list(VOICES.keys())}")
    app.run(host="0.0.0.0", port=port, threaded=True)
