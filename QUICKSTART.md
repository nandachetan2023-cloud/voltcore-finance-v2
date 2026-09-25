# Quick Start Guide - Old ERP

This guide will help you get old_erp running in under 5 minutes.

## Prerequisites Check

```bash
# Check if you have Node.js or Bun installed
node --version  # Should be 18+
# OR
bun --version

# Check if PostgreSQL is running
psql --version
```

## Step 1: Navigate to old_erp

```bash
cd old_erp
```

## Step 2: Install Dependencies

```bash
npm install
# OR if you have Bun
bun install
```

## Step 3: Configure Database

Edit the `.env` file with your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
```

Example:
```env
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/old_erp?schema=public"
```

## Step 4: Setup Database

```bash
npm run db:push
# OR
bun run db:push
```

This will create all the tables in your database.

## Step 5: Seed Initial Data (Optional but Recommended)

```bash
npm run db:seed
# OR
bun run db:seed
```

This creates an admin user:
- Email: `admin@voltcore.in`
- Password: `<ADMIN_PASSWORD>`

## Step 6: Start Development Server

```bash
npm run dev
# OR
bun run dev
```

## Step 7: Open in Browser

Navigate to: `http://localhost:3000`

Login with:
- Email: `admin@voltcore.in`
- Password: `<ADMIN_PASSWORD>`

## That's It! 🎉

You should now see the ERP dashboard with all modules available.

## Troubleshooting

### Port 3000 is already in use

Kill the process using port 3000:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

Or change the port in `package.json`:
```json
"dev": "next dev -p 3001"
```

### Database connection failed

1. Make sure PostgreSQL is running
2. Verify your credentials in `.env`
3. Test connection:
   ```bash
   psql "postgresql://username:password@localhost:5432/database_name"
   ```

### Module not found errors

Clear cache and reinstall:
```bash
rm -rf node_modules .next
npm install
npm run dev
```

## Next Steps

- Explore the 20+ ERP modules in the sidebar
- Check `README.md` for detailed documentation
- Customize the theme in `src/app/globals.css`
- Add your own modules in `src/app/api/`

## Need Help?

- Check `README.md` for full documentation
- Review the project structure in `src/`
- Look at existing API routes in `src/app/api/` for examples
