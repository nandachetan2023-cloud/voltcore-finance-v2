# Database Migration Guide
## Copying your entire PostgreSQL database from one server to another

This guide covers migrating all 3 databases (`erp_superadmin`, `erp`, `erp_demo`) from your current server to a new one with all data intact.

---

## Prerequisites

- PostgreSQL installed on both servers
- `pg_dump` and `psql` available on both (comes with PostgreSQL)
- Network access between servers (or ability to transfer files)
- Same or newer PostgreSQL version on the target server

---

## Option A: Direct Server-to-Server (if both are accessible)

### Step 1 — Dump all databases on the source server

```bash
# SSH into your current server
ssh user@old-server

# Dump each database (schema + data)
pg_dump -h localhost -U postgres -Fc erp_superadmin > erp_superadmin.dump
pg_dump -h localhost -U postgres -Fc erp > erp.dump
pg_dump -h localhost -U postgres -Fc erp_demo > erp_demo.dump
```

> `-Fc` = custom format (compressed, fastest for restore)

### Step 2 — Transfer dump files to the new server

```bash
scp erp_superadmin.dump erp.dump erp_demo.dump user@new-server:/tmp/
```

### Step 3 — Create databases on the new server

```bash
# SSH into the new server
ssh user@new-server

# Create the databases
sudo -u postgres psql -c "CREATE DATABASE erp_superadmin;"
sudo -u postgres psql -c "CREATE DATABASE erp;"
sudo -u postgres psql -c "CREATE DATABASE erp_demo;"

# Create the user (if not using postgres)
sudo -u postgres psql -c "CREATE USER erp_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE erp_superadmin TO erp_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE erp TO erp_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE erp_demo TO erp_user;"
```

### Step 4 — Restore the dumps

```bash
pg_restore -h localhost -U postgres -d erp_superadmin --no-owner --no-acl /tmp/erp_superadmin.dump
pg_restore -h localhost -U postgres -d erp --no-owner --no-acl /tmp/erp.dump
pg_restore -h localhost -U postgres -d erp_demo --no-owner --no-acl /tmp/erp_demo.dump
```

> `--no-owner` = don't try to set original ownership (avoids permission errors)
> `--no-acl` = skip access privilege commands

### Step 5 — Grant permissions

```bash
sudo -u postgres psql -d erp_superadmin -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO erp_user; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO erp_user;"
sudo -u postgres psql -d erp -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO erp_user; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO erp_user;"
sudo -u postgres psql -d erp_demo -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO erp_user; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO erp_user;"
```

### Step 6 — Update .env on the new server

```env
DATABASE_URL="postgresql://erp_user:your_password@localhost:5432/erp?schema=public"
DEMO_DATABASE_URL="postgresql://erp_user:your_password@localhost:5432/erp_demo?schema=public"
SUPERADMIN_DATABASE_URL="postgresql://erp_user:your_password@localhost:5432/erp_superadmin?schema=public"
```

### Step 7 — Update tenant DB URLs in superadmin

If your tenant `dbUrl` values point to the old server, update them:

```bash
sudo -u postgres psql -d erp_superadmin -c "
UPDATE \"Tenant\" SET \"dbUrl\" = REPLACE(\"dbUrl\", 'old-server-ip', 'localhost');
"
```

---

## Option B: Plain SQL (if custom format doesn't work)

```bash
# Dump as plain SQL
pg_dump -h localhost -U postgres --clean --if-exists erp_superadmin > erp_superadmin.sql
pg_dump -h localhost -U postgres --clean --if-exists erp > erp.sql
pg_dump -h localhost -U postgres --clean --if-exists erp_demo > erp_demo.sql

# Transfer
scp *.sql user@new-server:/tmp/

# Restore on new server
psql -h localhost -U postgres -d erp_superadmin < /tmp/erp_superadmin.sql
psql -h localhost -U postgres -d erp < /tmp/erp.sql
psql -h localhost -U postgres -d erp_demo < /tmp/erp_demo.sql
```

---

## Option C: From local Windows machine to VPS

If you're migrating from your local Windows dev machine:

```powershell
# On your Windows machine (in PowerShell)
$env:PGPASSWORD='chinmay12d'

pg_dump -h localhost -U postgres -Fc erp_superadmin > C:\temp\erp_superadmin.dump
pg_dump -h localhost -U postgres -Fc erp > C:\temp\erp.dump
pg_dump -h localhost -U postgres -Fc erp_demo > C:\temp\erp_demo.dump
```

Then upload to VPS via SCP/SFTP and restore using Step 3-6 from Option A.

---

## Verification

After restoring, verify everything is intact:

```bash
# Check table counts
psql -U postgres -d erp_superadmin -c "SELECT 'Tenants', COUNT(*) FROM \"Tenant\" UNION ALL SELECT 'Users', COUNT(*) FROM \"TenantUser\";"
psql -U postgres -d erp -c "SELECT 'Employees', COUNT(*) FROM \"Employee\" UNION ALL SELECT 'Attendance', COUNT(*) FROM \"AttendanceLog\";"
```

---

## After Migration Checklist

- [ ] Update `.env` with new database URLs
- [ ] Update tenant `dbUrl` values if server IP changed
- [ ] Run `npx prisma generate` and `npx prisma generate --schema=prisma/superadmin.prisma`
- [ ] Rebuild the app: `npm run build`
- [ ] Restart the server: `pm2 restart all`
- [ ] Test login with an existing user
- [ ] Verify biometric sync still works (credentials are in superadmin DB)
- [ ] Check that payslips and documents are accessible

---

## Notes

- Dump files include ALL data: employees, attendance, payroll, documents (binary), notifications, etc.
- Passwords are stored as bcrypt hashes — they transfer as-is, no re-hashing needed
- Uploaded documents (onboarding form files) are stored as binary in `OnboardingTask.documentData` — they're included in the dump
- Tenant logos are stored as base64 in `Tenant.logoUrl` — also included
