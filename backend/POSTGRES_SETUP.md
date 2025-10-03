# PostgreSQL Setup Guide

## Once PostgreSQL is installed:

### 1. Start PostgreSQL Service
After installation, PostgreSQL should start automatically. If not:
```bash
# Windows (as admin)
net start postgresql-x64-13  # or whatever version was installed

# Or through Services:
services.msc -> PostgreSQL -> Start
```

### 2. Create Database
```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create database
CREATE DATABASE schedule_builder;

# Exit psql
\q
```

### 3. Verify Connection
The backend expects these default settings (from .env):
- Host: localhost
- Port: 5432
- User: postgres
- Password: postgres
- Database: schedule_builder

### 4. Update Password (if needed)
If the postgres user has a different password:
```bash
psql -U postgres
ALTER USER postgres PASSWORD 'postgres';
\q
```

### 5. Run Migrations
Once PostgreSQL is running and database is created:
```bash
cd backend
npm run migration:run
```

### 6. Start Backend
```bash
npm run dev
```

## Troubleshooting

### If connection still fails:
1. Check if PostgreSQL service is running
2. Verify port 5432 is not blocked by firewall
3. Check postgresql.conf for listen_addresses
4. Check pg_hba.conf for authentication settings

### Alternative: Use Docker
If installation is difficult, you can use Docker:
```bash
docker run --name postgres-schedule \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=schedule_builder \
  -p 5432:5432 \
  -d postgres:13
```