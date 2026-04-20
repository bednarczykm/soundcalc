#!/usr/bin/env bash
set -euo pipefail
APP=soundcalc
DEPLOY_USER="${DEPLOY_USER:-biteam}"

cat > "/usr/local/bin/$APP-deploy" <<'WRAPPER'
#!/bin/bash
exec /opt/APP_NAME/deploy/remote-deploy.sh "$@"
WRAPPER
sed -i "s/APP_NAME/$APP/g" "/usr/local/bin/$APP-deploy"
chmod +x "/usr/local/bin/$APP-deploy"

echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/local/bin/$APP-deploy" > "/etc/sudoers.d/$APP-deploy"
chmod 440 "/etc/sudoers.d/$APP-deploy"

sudo -u "$DEPLOY_USER" bash -c "
  mkdir -p ~/.ssh
  ssh-keygen -t ed25519 -f ~/.ssh/${APP}_deploy -N '' -C '${APP}-github-actions' -q
  cat ~/.ssh/${APP}_deploy.pub >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
"

echo ""
echo "=== Dodaj te 3 secrets do https://github.com/bednarczykm/$APP/settings/secrets/actions ==="
echo "DEPLOY_HOST=89.167.14.46"
echo "DEPLOY_USER=$DEPLOY_USER"
echo "DEPLOY_SSH_KEY:"
cat "/home/$DEPLOY_USER/.ssh/${APP}_deploy"
