#!/usr/bin/env bash
set -euo pipefail
APP=soundcalc
LOG="/var/log/${APP}-install.log"
exec >> "$LOG" 2>&1
echo "=== $(date) Deploy $APP ==="
git -c safe.directory=/opt/$APP -C /opt/$APP fetch origin main
git -c safe.directory=/opt/$APP -C /opt/$APP reset --hard origin/main
sudo -u "$APP" -H bash -c "cd /opt/$APP/nextjs_space && npm ci && npm run build"
systemctl restart "$APP"
echo "=== Deploy done ==="
