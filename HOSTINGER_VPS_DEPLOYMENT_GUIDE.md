# Hostinger VPS Deployment Guide

Complete step-by-step guide to deploy this Next.js ERP on a Hostinger VPS.

---

## What You're Deploying

| Component | Details |
|---|---|
| App | Next.js 16 (App Router, SSR + API routes) |
| Runtime | Node.js via Bun |
| Database | PostgreSQL (3 databases: main, demo, superadmin) |
| Reverse Proxy | Caddy (already configured in `Caddyfile`) |
| Process Manager | PM2 |
| Auth | NextAuth v4 |

---

## Step 1 — Buy the Right VPS Plan

Go to [hostinger.com/vps-hosting](https://www.hostinger.com/vps-hosting).

**Minimum recommended plan:**
- **KVM 2** — 2 vCPU, 8 GB RAM, ~$8–12/month
- OS: **Ubuntu 22.04 LTS** (select during setup)

> KVM 1 (1 GB RAM) is too tight for Next.js + PostgreSQL + Prisma running together.

---

## Step 2 — Initial Server Setup

SSH into your VPS. Hostinger gives you root access and the IP in your dashboard.

```bash
ssh root@YOUR_SERVER_IP
```

### 2.1 Update the system

```bash
apt update && apt upgrade -y
```

### 2.2 Create a non-root user (recommended)

```bash
adduser erp
usermod -aG sudo erp
# Copy SSH keys to new user
rsync --archive --chown=erp:erp ~/.ssh /home/erp
```

Switch to the new user for all remaining steps:

```bash
su - erp
```

### 2.3 Set the timezone

```bash
sudo timedatectl set-timezone Asia/Kolkata
```

---

## Step 3 — Install Node.js and Bun

Your project uses Bun as the runtime and package manager.

### 3.1 Install Node.js 20 LTS (required by some dependencies)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # should print v20.x.x
```

### 3.2 Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version    # should print 1.x.x
```

---

## Step 4 — Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 4.1 Create databases and user

```bash
sudo -u postgres psql
```

Inside the psql shell, run:

```sql
-- Create a dedicated user (replace 'yourpassword' with a strong password)
CREATE USER erp_user WITH PASSWORD 'yourpassword';

-- Create the three databases
CREATE DATABASE erp OWNER erp_user;
CREATE DATABASE erp_demo OWNER erp_user;
CREATE DATABASE erp_superadmin OWNER erp_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE erp TO erp_user;
GRANT ALL PRIVILEGES ON DATABASE erp_demo TO erp_user;
GRANT ALL PRIVILEGES ON DATABASE erp_superadmin TO erp_user;

\q
```

### 4.2 Allow local connections (verify pg_hba.conf)

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Make sure this line exists (it usually does by default):

```
local   all   all   md5
host    all   all   127.0.0.1/32   md5
```

Restart PostgreSQL after any changes:

```bash
sudo systemctl restart postgresql
```

---

## Step 5 — Install Caddy

Caddy is your reverse proxy. Your `Caddyfile` is already configured.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
caddy version
```

---

## Step 6 — Install PM2

PM2 keeps your Next.js app running as a background daemon and restarts it on crashes.

```bash
sudo npm install -g pm2
pm2 --version
```

---

## Step 7 — Deploy Your Application

### 7.1 Install Git and clone your repo

```bash
sudo apt install -y git
cd /home/erp
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git app
cd app
```

> If your repo is private, use a personal access token:
> `git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git app`

### 7.2 Install dependencies

```bash
bun install
```

### 7.3 Create the production `.env` file

```bash
nano .env
```

Paste and fill in your values:

```env
# Main tenant database
DATABASE_URL="postgresql://erp_user:yourpassword@localhost:5432/erp?schema=public"

# Demo database
DEMO_DATABASE_URL="postgresql://erp_user:yourpassword@localhost:5432/erp_demo?schema=public"

# Superadmin database
SUPERADMIN_DATABASE_URL="postgresql://erp_user:yourpassword@localhost:5432/erp_superadmin?schema=public"

# NextAuth — MUST be set for production
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="generate-a-random-secret-here"

# Node environment
NODE_ENV="production"
```

**Generate a secure NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NEXTAUTH_SECRET`.

### 7.4 Run database migrations

This pushes your Prisma schema to all three databases:

```bash
# Main database
bun run db:push

# Superadmin database
DATABASE_URL=$SUPERADMIN_DATABASE_URL npx prisma db push --schema=prisma/superadmin.prisma
```

### 7.5 Seed the database (if needed)

```bash
bun run db:seed
```

### 7.6 Build the Next.js app

```bash
bun run build
```

This will take 2–5 minutes. You should see a successful build output with route sizes.

---

## Step 8 — Configure Caddy for Your Domain

### 8.1 Point your domain to the VPS

In your domain registrar's DNS settings, add an **A record**:

```
Type: A
Name: @  (or subdomain like "erp")
Value: YOUR_SERVER_IP
TTL: 300
```

Wait 5–15 minutes for DNS to propagate.

### 8.2 Update the Caddyfile

Replace the existing `Caddyfile` in your project root:

```bash
nano Caddyfile
```

Replace the contents with:

```
yourdomain.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
```

> Caddy automatically provisions a free Let's Encrypt SSL certificate for your domain.
> No manual SSL setup needed.

If you want to keep the port 81 proxy for internal use alongside the domain, you can have both blocks in the same Caddyfile.

### 8.3 Start Caddy

```bash
sudo systemctl stop caddy   # stop the default caddy service if running
```

We'll run Caddy via PM2 alongside Next.js (see Step 9).

---

## Step 9 — Start Everything with PM2

### 9.1 Create a PM2 ecosystem file

In your app directory (`/home/erp/app`):

```bash
nano ecosystem.config.js
```

```js
module.exports = {
  apps: [
    {
      name: 'erp-nextjs',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/erp/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/home/erp/logs/erp-error.log',
      out_file: '/home/erp/logs/erp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
```

Create the logs directory:

```bash
mkdir -p /home/erp/logs
```

### 9.2 Start the Next.js app

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

The `pm2 startup` command will print a `sudo` command — copy and run it. This makes PM2 restart your app automatically after a server reboot.

### 9.3 Start Caddy

```bash
sudo caddy start --config /home/erp/app/Caddyfile
```

Or run it as a systemd service (recommended):

```bash
sudo nano /etc/systemd/system/caddy-erp.service
```

```ini
[Unit]
Description=Caddy ERP Reverse Proxy
After=network.target

[Service]
User=root
WorkingDirectory=/home/erp/app
ExecStart=/usr/bin/caddy run --config /home/erp/app/Caddyfile --adapter caddyfile
ExecReload=/usr/bin/caddy reload --config /home/erp/app/Caddyfile --adapter caddyfile
TimeoutStopSec=5s
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable caddy-erp
sudo systemctl start caddy-erp
sudo systemctl status caddy-erp
```

---

## Step 10 — Open Firewall Ports

Hostinger VPS uses `ufw`. Allow only what's needed:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp    # HTTP (Caddy redirects to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

> Do NOT expose port 3000 or 5432 publicly. Next.js runs behind Caddy, and PostgreSQL should only be accessible locally.

---

## Step 11 — Verify Everything Works

```bash
# Check Next.js is running
pm2 status

# Check Caddy is running
sudo systemctl status caddy-erp

# Check PostgreSQL is running
sudo systemctl status postgresql

# Test the app locally on the server
curl http://localhost:3000

# Check logs if something is wrong
pm2 logs erp-nextjs --lines 50
```

Open your browser and go to `https://yourdomain.com`. You should see the ERP login page with a valid SSL certificate.

---

## Step 12 — Set Up the Biometric Sync Cron (Optional)

Your app has a biometric sync script. Run it on a schedule using PM2's cron feature or system cron.

### Using system cron:

```bash
crontab -e
```

Add this line to run the sync every 15 minutes:

```
*/15 * * * * cd /home/erp/app && bun run biometric:sync >> /home/erp/logs/biometric-sync.log 2>&1
```

---

## Updating the App (Deployments)

When you push new code, SSH into the server and run:

```bash
cd /home/erp/app
git pull origin main
bun install
bun run build
pm2 restart erp-nextjs
```

If you have database schema changes:

```bash
bun run db:push
```

---

## Troubleshooting

### App won't start

```bash
pm2 logs erp-nextjs --lines 100
```

Common causes:
- Missing `.env` variables (especially `NEXTAUTH_SECRET` and `NEXTAUTH_URL`)
- Database connection refused — check PostgreSQL is running and credentials are correct
- Build not completed — run `bun run build` again

### Database connection errors

```bash
# Test connection manually
psql -U erp_user -h localhost -d erp
```

If it fails, check your password and that PostgreSQL is listening on localhost.

### Caddy SSL not working

```bash
sudo journalctl -u caddy-erp -n 50
```

Common causes:
- DNS hasn't propagated yet (wait 15 minutes)
- Port 80/443 not open in firewall
- Domain typo in Caddyfile

### Out of memory

```bash
free -h
pm2 monit
```

If RAM is tight, add a swap file:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Summary Checklist

- [ ] Hostinger KVM 2 VPS with Ubuntu 22.04
- [ ] Node.js 20 + Bun installed
- [ ] PostgreSQL installed with 3 databases created
- [ ] Caddy installed
- [ ] PM2 installed
- [ ] Repo cloned to `/home/erp/app`
- [ ] `.env` file created with production values
- [ ] `bun run db:push` run for both schemas
- [ ] `bun run build` completed successfully
- [ ] `ecosystem.config.js` created
- [ ] PM2 started and saved with startup hook
- [ ] Caddyfile updated with your domain
- [ ] Caddy systemd service running
- [ ] Firewall: ports 22, 80, 443 open only
- [ ] App accessible at `https://yourdomain.com`
