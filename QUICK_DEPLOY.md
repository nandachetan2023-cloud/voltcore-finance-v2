# Quick Deploy - One Page Reference

## 🚀 Deploy in 5 Minutes

### On Your Local Machine

```bash
# Commit and push changes
git add .
git commit -m "Feature: Employee bulk import improvements"
git push origin main
```

### On Your Server

```bash
# SSH into server
ssh erp@YOUR_SERVER_IP

# Navigate to app directory
cd /home/erp/app

# Pull, build, and restart (one command)
git pull origin main && bun install && bun run build && pm2 restart erp-nextjs

# Check if running
pm2 status
pm2 logs erp-nextjs --lines 20
```

That's it! Your changes are live.

---

## 🔍 Verify Deployment

Open browser → `https://yourdomain.com` → Go to Employees → Click "Bulk Import"

✅ Template downloads  
✅ Validation shows errors  
✅ Import works  

---

## 🆘 Quick Troubleshooting

### Build Failed?
```bash
# Check swap (KVM 1 only)
free -h
sudo swapon /swapfile

# Try build again
bun run build
```

### App Not Starting?
```bash
# Check logs
pm2 logs erp-nextjs --err

# Check .env file
cat .env

# Restart
pm2 restart erp-nextjs
```

### Old Code Still Showing?
```bash
# Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
# Or clear browser cache
```

---

## 📊 Monitor Performance

```bash
# Live monitoring
pm2 monit

# Memory usage
free -h

# Disk space
df -h
```

---

## 🔄 Rollback If Needed

```bash
cd /home/erp/app
git revert HEAD
bun run build
pm2 restart erp-nextjs
```

---

## 📝 Database Backup (Before Large Imports)

```bash
mkdir -p ~/backups
pg_dump -U erp_user -h localhost erp > ~/backups/erp_$(date +%Y%m%d_%H%M%S).sql
```

---

## ✅ Success Indicators

- PM2 status shows `online`
- Logs show no errors
- Website loads
- Employee bulk import works

---

## 📚 Full Guides

- Complete server setup: `HOSTINGER_VPS_DEPLOYMENT_GUIDE.md`
- Feature deployment: `DEPLOY_EMPLOYEE_BULK_IMPORT.md`
- Feature documentation: `EMPLOYEE_BULK_IMPORT_COMPLETE_SUMMARY.md`
