#!/usr/bin/env bash
# start-tts.sh - Manage TTS server daemons for MoodGluco
#
# Usage: ./scripts/start-tts.sh <engine> [start|stop|restart|status|logs]
# Engines: xtts (5002) | edge (5003) | kokoro (5004) | piper (5005)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE="${1:-}"
ACTION="${2:-status}"
DETECT_IP_SCRIPT="$SCRIPT_DIR/detect-ip.sh"

case "$ENGINE" in
  xtts)
    SERVER_SCRIPT="$SCRIPT_DIR/xtts_server.py"
    PORT=5002
    EXTRA_ENV="COQUI_TOS_AGREED=1"
    INSTALL_HINT="conda activate xtts && pip install TTS flask flask-cors numpy"
    ;;
  edge)
    SERVER_SCRIPT="$SCRIPT_DIR/edge_tts_server.py"
    PORT=5003
    EXTRA_ENV=""
    INSTALL_HINT="pip install edge-tts flask flask-cors"
    ;;
  kokoro)
    SERVER_SCRIPT="$SCRIPT_DIR/kokoro_server.py"
    PORT=5004
    EXTRA_ENV=""
    INSTALL_HINT="pip install kokoro-onnx soundfile flask flask-cors numpy"
    ;;
  piper)
    SERVER_SCRIPT="$SCRIPT_DIR/piper_server.py"
    PORT=5005
    EXTRA_ENV=""
    INSTALL_HINT="pip install piper-tts flask flask-cors numpy"
    ;;
  vision)
    SERVER_SCRIPT="$SCRIPT_DIR/vision_server.py"
    PORT=5006
    EXTRA_ENV=""
    INSTALL_HINT="conda create -n faceanalysis python=3.10 && pip install mediapipe==0.10.9 deepface opencv-python-headless==4.8.1.78 numpy==1.26.4 flask flask-cors pillow pillow-heif faster-whisper"
    ;;
  *)
    echo "Usage: $0 <engine> [start|stop|restart|status|logs]"
    echo "Engines: xtts | edge | kokoro | piper | vision"
    exit 1
    ;;
esac

PID_FILE="$SCRIPT_DIR/${ENGINE}.pid"
LOG_FILE="$SCRIPT_DIR/${ENGINE}.log"

find_python() {
  # Vision server uses its own dedicated env to avoid numpy conflicts
  if [[ "$ENGINE" == "vision" ]]; then
    local fa_py="/opt/homebrew/Caskroom/miniforge/base/envs/faceanalysis/bin/python"
    [[ -x "$fa_py" ]] && echo "$fa_py" && return 0
  fi
  for py in \
    "/opt/homebrew/Caskroom/miniforge/base/envs/xtts/bin/python" \
    "/opt/homebrew/Caskroom/miniforge/base/bin/python3" \
    "/opt/homebrew/Caskroom/miniforge/base/bin/python" \
    "$(which python3 2>/dev/null || true)" \
    "$(which python  2>/dev/null || true)"; do
    [[ -x "$py" ]] && echo "$py" && return 0
  done
  return 1
}

case "$ACTION" in

  start)
    if [[ "${MOODGLUCO_LAN_MODE:-0}" == "1" ]] && [[ -x "$DETECT_IP_SCRIPT" ]]; then
      "$DETECT_IP_SCRIPT" >/dev/null 2>&1 || true
    fi

    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "[$ENGINE] Already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi

    PY=$(find_python) || {
      echo "ERROR: No Python found. Install: $INSTALL_HINT"
      exit 1
    }
    echo "[$ENGINE] Using Python: $PY"

    echo "[$ENGINE] Starting on port $PORT..."
    if [[ -n "$EXTRA_ENV" ]]; then
      env "$EXTRA_ENV" nohup "$PY" "$SERVER_SCRIPT" > "$LOG_FILE" 2>&1 &
    else
      nohup "$PY" "$SERVER_SCRIPT" > "$LOG_FILE" 2>&1 &
    fi
    echo $! > "$PID_FILE"
    disown

    echo -n "[$ENGINE] Waiting for server"
    for i in $(seq 1 90); do
      sleep 1
      printf "."
      if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
        echo ""
        echo "OK [$ENGINE] Ready on http://127.0.0.1:${PORT} (PID $(cat "$PID_FILE"))"
        exit 0
      fi
    done
    echo ""
    echo "WARN [$ENGINE] Did not respond in 90s - check logs: $LOG_FILE"
    tail -20 "$LOG_FILE"
    exit 1
    ;;

  stop)
    if [[ -f "$PID_FILE" ]]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" && echo "OK [$ENGINE] Stopped (PID $PID)"
      else
        echo "[$ENGINE] Process $PID not running"
      fi
      rm -f "$PID_FILE"
    else
      echo "[$ENGINE] Not running (no PID file)"
    fi
    ;;

  restart)
    "$0" "$ENGINE" stop
    sleep 1
    "$0" "$ENGINE" start
    ;;

  status)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      HEALTH=$(curl -sf "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "no-response")
      echo "OK [$ENGINE] Running (PID $(cat "$PID_FILE")) - $HEALTH"
    else
      echo "[$ENGINE] Not running"
    fi
    ;;

  logs)
    tail -f "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 $ENGINE {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
