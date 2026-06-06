#!/usr/bin/env bash
# start-all-tts.sh - Start all local servers in the background.
# Uses start-tts.sh so each engine gets the correct Python environment.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "-- Starting local voice/vision servers --"

start_engine_async() {
  local ENGINE="$1"
  if [[ -x "$SCRIPT_DIR/start-tts.sh" ]]; then
    # Run each startup in background so Expo can boot immediately.
    nohup "$SCRIPT_DIR/start-tts.sh" "$ENGINE" start >/dev/null 2>&1 &
    disown || true
    echo "[$ENGINE] launch requested"
  else
    echo "WARN: start-tts.sh not found, cannot start $ENGINE"
  fi
}

# XTTS is heavy and can delay startup significantly.
# Enable it explicitly when needed: MOODGLUCO_START_XTTS=1 npm start
if [[ "${MOODGLUCO_START_XTTS:-0}" == "1" ]]; then
  start_engine_async xtts
else
  echo "[xtts] skipped (set MOODGLUCO_START_XTTS=1 to enable at boot)"
fi

start_engine_async edge
start_engine_async kokoro
start_engine_async piper
start_engine_async vision

echo "-- All servers launching. Expo starting now. --"
