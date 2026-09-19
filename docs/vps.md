# VPS hosting (Ubuntu 22.04, Node 22)
```
# 1) server
sudo apt update && sudo apt install -y nodejs certbot python3-certbot-nginx nginx
git clone https://github.com/Ahmedalkubari/ai-tour-medical-app && cd ai-tour-medical-app
node scripts/build-db.mjs && node scripts/expand-max.mjs && node scripts/build-vectors-lite.mjs
# 2) systemd: /etc/systemd/system/aitour.service
# ExecStart=/usr/bin/node /srv/ai-tour-medical-app/scripts/serve.mjs
# WorkingDirectory=/srv/ai-tour-medical-app  /  Restart=always
sudo systemctl enable --now aitour
# 3) nginx reverse proxy :8080 → 443 + certbot
sudo certbot --nginx -d med.example.com
# 4) backups cron (daily 02:00, keep 10)
0 2 * * * cd /srv/ai-tour-medical-app && /usr/bin/node scripts/backup.mjs
# 5) faculty admin (run once on server, rotate password)
node scripts/seed-admin.mjs dean
```
Security: UFW allow 22/80/443 only; DB file never served directly (API only); change admin password; `data/*-shm|-wal|client-errors.log` excluded from git.
