#!/bin/bash
# puffbase merged runtime: node app (PID1) + embedded depot + sshd.
# Replicates the upstream engine image's s6 tree, minus s6 — same /data
# layout so the existing puffbase_depot-data volume drops in.
set -e

export GITEA_WORK_DIR=/data
export GITEA_CUSTOM=/data/depot
export USER=git
export HOME=/data/git

mkdir -p /data/depot/conf /data/depot/log /data/git/.ssh /data/ssh /run/sshd
chown -R git:git /data

# app.ini from GITEA__* env vars (same thing env-to-ini does — refuses root).
runuser -u git -- /usr/local/bin/depot config edit-ini --in-place --apply-env || true

# git/.ssh permissions + environment file (from the upstream setup).
chmod 700 /data/git/.ssh
[ -f /data/git/.ssh/authorized_keys ] && chmod 600 /data/git/.ssh/authorized_keys
if ! grep -q "^GITEA_CUSTOM=$GITEA_CUSTOM$" /data/git/.ssh/environment 2>/dev/null; then
    sed -i '/^GITEA_CUSTOM=/d' /data/git/.ssh/environment 2>/dev/null || true
    echo "GITEA_CUSTOM=$GITEA_CUSTOM" >> /data/git/.ssh/environment
    chmod 600 /data/git/.ssh/environment
fi
chown -R git:git /data/git/.ssh

# SSH host keys, persisted in the data volume (official openssh/setup).
for kt in ed25519:ed25519 rsa:rsa ecdsa:ecdsa; do
    k=${kt%%:*}
    [ -f "/data/ssh/ssh_host_${k}_key" ] || \
        ssh-keygen -t "$k" -f "/data/ssh/ssh_host_${k}_key" -N "" >/dev/null
done
chown root:root /data/ssh/* 2>/dev/null || true
chmod 700 /data/ssh
chmod 600 /data/ssh/* 2>/dev/null || true

# sshd (git-over-ssh on :22, published as :2222) + depot with a respawn loop.
/usr/sbin/sshd
( while :; do runuser -u git -- /usr/local/bin/depot web; sleep 2; done ) &

exec "$@"
