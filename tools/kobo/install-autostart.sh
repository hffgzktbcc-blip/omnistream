#!/bin/sh

# =============================================================================
# Kobo Automatic Background Sync Installer
# =============================================================================
# Installs udev network trigger and udhcpc hook so that Shelf / OmniStream
# syncs automatically whenever Wi-Fi turns on, without opening NickelMenu.
# =============================================================================

ROOT="/mnt/onboard/.adds/shelf-sync"

echo "Installing Automatic Kobo Background Sync..."

# 1. Install udev rule if root writable
if [ -d "/etc/udev/rules.d" ]; then
  cp "$ROOT/99-shelf-sync.rules" /etc/udev/rules.d/ 2>/dev/null || true
  udevadm control --reload 2>/dev/null || true
  echo "✓ Installed udev network trigger (/etc/udev/rules.d/99-shelf-sync.rules)"
fi

# 2. Install udhcpc hook (runs on DHCP lease acquisition)
if [ -d "/etc/udhcpc.d" ]; then
  cp "$ROOT/autostart.sh" /etc/udhcpc.d/99-shelf-sync 2>/dev/null || true
  chmod +x /etc/udhcpc.d/99-shelf-sync 2>/dev/null || true
  echo "✓ Installed DHCP network hook (/etc/udhcpc.d/99-shelf-sync)"
fi

# 3. Start background sync now
/bin/sh "$ROOT/autostart.sh"
echo "✓ Background sync daemon started!"
echo ""
echo "Installation complete! Your Kobo will now sync reading positions automatically in the background whenever Wi-Fi is active."
