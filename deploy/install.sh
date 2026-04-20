#!/usr/bin/env bash
set -euo pipefail
APP=soundcalc
PORT=3200
DOMAIN="${DOMAIN:-soundcalc.efapp.pl}"
ADMIN_EMAIL="${ADMIN_EMAIL:-marcinbednarczyk9@gmail.com}"
GH_TOKEN="${GH_TOKEN:-}"
LOG="/var/log/${APP}-install.log"
exec > >(tee -a "$LOG") 2>&1
echo "=== $(date) Bootstrap $APP ==="

id "$APP" &>/dev/null || useradd --system --create-home --shell /bin/bash "$APP"

if [ ! -d "/opt/$APP/.git" ]; then
  if [ -n "$GH_TOKEN" ]; then
    git clone "https://${GH_TOKEN}@github.com/bednarczykm/${APP}.git" "/opt/$APP"
  else
    git clone "https://github.com/bednarczykm/${APP}.git" "/opt/$APP"
  fi
fi
chown -R "$APP:$APP" "/opt/$APP"

sudo -u "$APP" -H bash -c "cd /opt/$APP/nextjs_space && npm install && npm run build"

cat > "/etc/systemd/system/$APP.service" <<SERVICE
[Unit]
Description=$APP web app
After=network.target

[Service]
Type=simple
User=$APP
Group=$APP
WorkingDirectory=/opt/$APP/nextjs_space
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm start --silent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "$APP"
systemctl start "$APP"

cat > "/etc/nginx/sites-available/$APP" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    client_max_body_size 25m;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf "/etc/nginx/sites-available/$APP" "/etc/nginx/sites-enabled/$APP"
nginx -t && systemctl reload nginx
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL"

echo "=== Bootstrap $APP done — https://$DOMAIN ==="
