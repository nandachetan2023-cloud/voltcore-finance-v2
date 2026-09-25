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

### Plan comparison

| Plan | vCPU | RAM | Storage | India price (intro) | Renewal | Use case |
|---|---|---|---|---|---|---|
| **KVM 1** | 1 | 4 GB | 50 GB NVMe | ₹599/mo | ₹999/mo | Testing / staging |
| **KVM 2** | 2 | 8 GB | 100 GB NVMe | ₹799/mo | ₹1,199/mo | Production (recommended) |
| KVM 4 | 4 | 16 GB | 200 GB NVMe | ₹1,099/mo | ₹2,399/mo | Multi-tenant / heavy load |

**For production:** use **KVM 2**.
**For testing/staging:** KVM 1 works — see the [KVM 1 Testing Setup](#appendix-kvm-1-testing-phase-setup) appendix at the end of this guide.

- OS: **Ubuntu 22.04 LTS** (select during setup)

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

**IMPORTANT: Run these in order!**

```bash
# Step 1: Push main database schema
bun run db:push
```

Wait for it to complete, then:

```bash
# Step 2: Push superadmin database schema
npx prisma db push --schema=prisma/superadmin.prisma
```

You should see "Your database is now in sync with your Prisma schema" for both.

### 7.5 Seed the superadmin account

This creates the superadmin login (everything else is managed through the UI):

```bash
bun run db:seed
```

You should see:
```
✅ SuperAdmin account created
   Email:    superadmin@voltcore.in
   Password: superadmin@123

📋 Next steps:
   1. Login at /superadmin with the credentials above
   2. Create tenants (companies) from the superadmin dashboard
   3. Create users for each tenant
   4. Assign roles and modules to users
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

# IMPORTANT: Push any schema changes to the database
bun run db:push

# If you get schema conflicts, use --accept-data-loss (be careful!)
# npx prisma db push --accept-data-loss

bun run build
pm2 restart erp-nextjs
```

**If you added new tables or columns to the Prisma schema:**
```bash
# Also push to superadmin database if you changed prisma/superadmin.prisma
npx prisma db push --schema=prisma/superadmin.prisma
```

---

## Troubleshooting

### Seed fails with "table SuperAdminUser does not exist"

This means you haven't pushed the superadmin schema yet. Run:

```bash
npx prisma db push --schema=prisma/superadmin.prisma
```

Then try seeding again:

```bash
bun run db:seed
```

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

---

## Appendix: KVM 1 Testing Phase Setup

> Use this when you want a cheap server (₹599/mo) to test the app, demo it to a client, or run QA before going to production. Not suitable for real users or live data.

### What's different on KVM 1

| | KVM 1 (Testing) | KVM 2 (Production) |
|---|---|---|
| RAM | 4 GB | 8 GB |
| vCPU | 1 | 2 |
| Build time | ~6–10 min | ~2–5 min |
| Concurrent users | < 10 safely | 20–100 |
| Swap required | Yes (mandatory) | Optional |
| PM2 memory limit | 512 MB | 1 GB |

---

### A.1 — Add swap before doing anything else

This is mandatory on KVM 1. Without it, `bun run build` will likely get OOM-killed.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verify it's active:

```bash
free -h
# Should show ~2G under Swap
```

---

### A.2 — Tune PostgreSQL for low RAM

The default PostgreSQL config is tuned for servers with more RAM. On KVM 1, reduce its memory footprint:

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Find and update these values:

```
shared_buffers = 128MB          # default is 128MB, keep it
work_mem = 4MB                  # default is 4MB, keep it
maintenance_work_mem = 64MB     # reduce from 64MB default
max_connections = 20            # reduce from 100 — your app uses a connection pool
effective_cache_size = 512MB    # tell PG how much OS cache is available
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

### A.3 — Reduce PM2 memory limit

In your `ecosystem.config.js`, lower the memory restart threshold so PM2 recycles the process before it starves the OS:

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
      max_memory_restart: '512M',   // lower than production's 1G
      error_file: '/home/erp/logs/erp-error.log',
      out_file: '/home/erp/logs/erp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
```

---

### A.4 — Use HTTP only (no domain needed for testing)

If you're just testing and don't have a domain yet, skip the Caddy SSL setup and access the app directly on port 3000 via the server IP.

Open port 3000 in the firewall temporarily:

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

Access the app at: `http://YOUR_SERVER_IP:3000`

Update your `.env` accordingly:

```env
NEXTAUTH_URL="http://YOUR_SERVER_IP:3000"
NEXTAUTH_SECRET="any-random-string-for-testing"
NODE_ENV="production"
```

> When you're done testing and move to KVM 2 for production, close port 3000 again (`sudo ufw delete allow 3000/tcp`) and set up Caddy with your domain properly.

---

### A.5 — Monitor RAM during testing

Keep an eye on memory while you test heavy operations (payroll generation, bulk imports, Excel exports):

```bash
# Live process monitor
pm2 monit

# Quick RAM snapshot
free -h

# See what's eating memory
ps aux --sort=-%mem | head -15
```

If you see swap usage climbing above 1 GB consistently, the KVM 1 plan is too small for your workload and you should upgrade to KVM 2.

---

### A.6 — Upgrading from KVM 1 to KVM 2

When you're ready to go to production, Hostinger lets you upgrade the plan without reinstalling the OS or losing data:

1. Go to your Hostinger hPanel → VPS → Upgrade
2. Select KVM 2
3. Pay the difference
4. The server reboots with more RAM and CPU — your app, databases, and files stay intact

After upgrading, update `max_memory_restart` in `ecosystem.config.js` back to `'1G'` and restart PM2:

```bash
pm2 restart erp-nextjs
```

---

### KVM 1 Testing Checklist

- [ ] 2 GB swap file created and persisted in `/etc/fstab`
- [ ] PostgreSQL tuned (`max_connections = 20`, `effective_cache_size = 512MB`)
- [ ] PM2 `max_memory_restart` set to `512M`
- [ ] Port 3000 opened in firewall (if no domain)
- [ ] `.env` uses `http://YOUR_SERVER_IP:3000` for `NEXTAUTH_URL`
- [ ] `bun run build` completed without OOM errors
- [ ] App accessible at `http://YOUR_SERVER_IP:3000`
- [ ] RAM monitored during heavy operations (`pm2 monit`)
