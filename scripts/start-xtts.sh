#!/usr/bin/env bash
# start-xtts.sh -- Manage the XTTS v2 server daemon
# Usage: ./scripts/start-xtts.sh [start|stop|restart|status|logs]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_SCRIPT="$SCRIPT_DIR/xtts_server.py"
PID_FILE="$SCRIPT_DIR/xtts.pid"
LOG_FILE="$SCRIPT_DIR/xtts.log"
PORT=5002

# -- Find a Python that has TTS installed -------------------------------------
find_python() {
  for py in \
    "/opt/homebrew/Caskroom/miniforge/base/envs/xtts/bin/python" \
    "/opt/homebrew/Caskroom/miniforge/base/bin/python3" \
    "/opt/homebrew/Caskroom/miniforge/base/bin/python" \
    "$(which python3 2>/dev/null || true)"; do
    if [[ -x "$py" ]] && "$py" -c "import TTS" 2>/dev/null; then
      echo "$py"
      return 0
    fi
  done
  return 1
}

# -- Install deps if missing --------------------------------------------------
ensure_deps() {
  local py="$1"
  echo "-> Checking Python deps..."
  "$py" -c "import flask, flask_cors, numpy" 2>/dev/null && return 0
  echo "-> Installing flask flask-cors numpy..."
  "$py" -m pip install -q flask flask-cors numpy
}

# -----------------------------------------------------------------------------

case "${1:-status}" in

  start)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "XTTS already running (PID $(cat "$PID_FILE"))"
      exit 0
    fi

    PY=$(find_python) || {
      echo "ERROR: No Python with TTS found."
      echo "Run: conda activate xtts && pip install TTS"
      exit 1
    }
    echo "-> Using Python: ${PY}"
    ensure_deps "$PY"

    echo "-> Starting XTTS server on port ${PORT}..."
    COQUI_TOS_AGREED=1 nohup "$PY" "$SERVER_SCRIPT" \
      > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    disown

    # Wait up to 60 s for the server to become healthy
    echo -n "-> Waiting for model to load"
    for i in $(seq 1 60); do
      sleep 1
      printf "."
      if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
        echo ""
        echo "OK XTTS server ready (PID $(cat "$PID_FILE"))"
        exit 0
      fi
    done
    echo ""
    echo "WARN Server did not respond in 60 s -- check logs:"
    tail -20 "$LOG_FILE"
    exit 1
    ;;

  stop)
    if [[ -f "$PID_FILE" ]]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" && echo "OK XTTS stopped (PID ${PID})"
      else
        echo "Process ${PID} not running"
      fi
      rm -f "$PID_FILE"
    else
      echo "No PID file -- XTTS not running"
    fi
    ;;

  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;

  status)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      HEALTH=$(curl -sf "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "no-response")
      echo "OK XTTS running (PID $(cat "$PID_FILE")) -- health: ${HEALTH}"
    else
      echo "XTTS not running"
    fi
    ;;

  logs)
    tail -f "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
