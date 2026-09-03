#!/bin/sh

# =============================================================================
# Shelf / OmniStream - Automatic Kobo Background Sync Trigger
# =============================================================================
# This script runs automatically on Kobo boot, Wi-Fi connection (udev/udhcpc),
# and wake from sleep — removing the need to manually trigger NickelMenu.
# =============================================================================

ROOT="/mnt/onboard/.adds/shelf-sync"
PIDFILE="$ROOT/.sync.pid"
SCRIPT="$ROOT/shelf-sync.sh"

# 1. Wait until filesystem is mounted
if [ ! -d "$ROOT" ]; then
  exit 0
fi

# 2. Check if already running and responsive
if [ -r "$PIDFILE" ]; then
  pid="$(cat "$PIDFILE" 2>/dev/null)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    # Already running cleanly in background
    exit 0
  fi
fi

# 3. Clean up any stale lock
rm -rf "$ROOT/.sync.lock" "$PIDFILE"

# 4. Launch sync daemon in background detached
if [ -x "$SCRIPT" ]; then
  nohup /bin/sh "$SCRIPT" >/dev/null 2>&1 &
fi

exit 0
