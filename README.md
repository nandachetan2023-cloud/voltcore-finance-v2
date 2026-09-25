# Old ERP - Standalone Application

This is a fully independent Next.js-based ERP application with no external dependencies on voltcore_erp or any parent directories.

## Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database
- (Optional) Caddy server for production deployment

## Quick Start

### 1. Install Dependencies

```bash
cd old_erp
npm install
# or
bun install
```

### 2. Configure Database

Edit `.env` file and set your database connection:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/your_database?schema=public"
```

### 3. Setup Database

```bash
# Push schema to database
npm run db:push
# or
bun run db:push

# (Optional) Seed initial data
npm run db:seed
# or
bun run db:seed
```

### 4. Run Development Server

```bash
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed database with initial data

## Alternative Start Methods

### Using Shell Scripts

```bash
# Development with auto-restart
./serve.sh

# Keep-alive mode (auto-restart on crash)
./keepalive.sh

# Advanced development with mini-services
./.zscripts/dev.sh
```

### Production Build

```bash
# Build everything
./.zscripts/build.sh

# Start production server
./.zscripts/start.sh
```

## Project Structure

```
old_erp/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   └── ...           # Pages and layouts
│   ├── components/       # React components
│   ├── lib/              # Utility libraries
│   └── store/            # State management
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Seed data
│   └── migrations/       # Database migrations
├── public/               # Static assets
├── database/             # SQL reference files
├── .zscripts/            # Build and deployment scripts
└── mini-services/        # Optional microservices

```

## Default Login Credentials

After seeding the database:

- Email: `admin@voltcore.in`
- Password: `<ADMIN_PASSWORD>`

## Features

- 20+ ERP modules (HRMS, Finance, Inventory, CRM, etc.)
- Modern UI with shadcn/ui components
- Dark theme with professional styling
- Responsive design
- Real-time updates with React Query
- Type-safe API with Prisma ORM
- PostgreSQL database

## Mini-Services (Optional)

The `mini-services/` directory can contain additional microservices that run alongside the main application. They will be automatically started by the development scripts.

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and the DATABASE_URL in `.env` is correct:

```bash
# Test connection
psql "postgresql://username:password@localhost:5432/your_database"
```

### Port Already in Use

If port 3000 is already in use, modify the dev script in `package.json`:

```json
"dev": "next dev -p 3001"
```

### Build Errors

Clear Next.js cache and rebuild:

```bash
rm -rf .next
npm run build
```

## Production Deployment

1. Build the application:
   ```bash
   ./.zscripts/build.sh
   ```

2. The build script creates a tarball in `/tmp/build_fullstack_*/`

3. Deploy the tarball to your server and extract it

4. Run the start script:
   ```bash
   ./start.sh
   ```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 3000)
- `HOSTNAME` - Server hostname (default: 0.0.0.0)

## License

Private - All rights reserved
