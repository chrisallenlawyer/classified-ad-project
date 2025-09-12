# Commands used to set up the project

## Database Setup
```bash
# Connect to PostgreSQL
/opt/homebrew/Cellar/postgresql@15/15.14/bin/psql postgres

# Create database and user
CREATE DATABASE local_classifieds;
CREATE USER classifieds_user WITH PASSWORD 'classifieds123';
GRANT ALL PRIVILEGES ON DATABASE local_classifieds TO classifieds_user;
ALTER DATABASE local_classifieds OWNER TO classifieds_user;
\q
```

## Project Setup
```bash
# Install all dependencies
npm run install:all

# Set up database schema and seed data
cd server
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..

# Start development servers
npm run dev
```

## URLs
- **Frontend**: http://localhost:5174/
- **Backend API**: http://localhost:3002/api/
- **Health Check**: http://localhost:3002/api/health
- **Categories**: http://localhost:3002/api/categories

## Troubleshooting Commands

### Port Conflicts
If you get "address already in use" errors:
```bash
# Find what's using a port
lsof -ti:3002
lsof -ti:5174

# Kill processes (replace XXXX with process ID)
kill -9 XXXX
```

### Database Permission Issues
```bash
# Connect as superuser and fix permissions
/opt/homebrew/Cellar/postgresql@15/15.14/bin/psql postgres
ALTER DATABASE local_classifieds OWNER TO classifieds_user;
GRANT ALL ON SCHEMA public TO classifieds_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO classifieds_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO classifieds_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO classifieds_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO classifieds_user;
\q
```

### Quick Start (for next time)
```bash
# Navigate to project
cd "/Volumes/My Passport/Classified Ad Project"

# Start servers
npm run dev

# Visit frontend
open http://localhost:5174/
```

## File Locations
- **Project root**: `/Volumes/My Passport/Classified Ad Project`
- **Server code**: `server/src/index.ts`
- **Frontend code**: `client/src/App.tsx`
- **Database config**: `server/.env`
- **Database schema**: `server/prisma/schema.prisma`
