# Schedule Builder Operations Guide

## Overview

This operations guide provides comprehensive instructions for deploying, monitoring, maintaining, and troubleshooting the Schedule Builder application in production environments.

## System Requirements

### Server Requirements

**Minimum Production Requirements**
- **CPU**: 4 cores (2.4 GHz or higher)
- **RAM**: 8 GB (16 GB recommended)
- **Storage**: 100 GB SSD (with 50 GB free space)
- **Network**: Stable internet connection (minimum 100 Mbps)

**Recommended Production Requirements**
- **CPU**: 8 cores (3.0 GHz or higher)
- **RAM**: 32 GB
- **Storage**: 500 GB SSD NVMe
- **Network**: Dedicated high-speed connection (1 Gbps)

**Database Requirements**
- **PostgreSQL**: Version 14 or higher
- **RAM**: 4 GB dedicated (8 GB recommended)
- **Storage**: 200 GB with automatic backup
- **Connections**: Support for 100+ concurrent connections

### Software Dependencies

**Runtime Environment**
```bash
Node.js: >= 18.0.0
npm: >= 8.0.0
PostgreSQL: >= 14.0
Redis: >= 6.0 (optional, for enhanced caching)
Docker: >= 20.0 (for containerized deployment)
```

**System Packages**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y build-essential python3 git curl

# CentOS/RHEL
sudo yum groupinstall -y "Development Tools"
sudo yum install -y python3 git curl
```

## Installation and Deployment

### Production Deployment

#### Method 1: Docker Deployment (Recommended)

**1. Prepare Environment**
```bash
# Create application directory
sudo mkdir -p /opt/schedule-builder
cd /opt/schedule-builder

# Clone repository
git clone <repository-url> .
```

**2. Configure Environment**
```bash
# Backend configuration
cp backend/.env.example backend/.env.production
```

Edit `backend/.env.production`:
```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=schedule_user
DB_PASSWORD=secure_password_here
DB_DATABASE=schedule_builder

# Application Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=very_secure_jwt_secret_here

# Performance Configuration
CACHE_ENABLED=true
PERFORMANCE_MONITORING=true
ERROR_RECOVERY_ENABLED=true

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/schedule-builder/app.log
```

**3. Build and Deploy**
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run
```

**4. Verify Deployment**
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl http://localhost:3000/api/health
```

#### Method 2: Manual Deployment

**1. System Preparation**
```bash
# Create application user
sudo useradd -m -s /bin/bash schedule-builder
sudo mkdir -p /opt/schedule-builder
sudo chown schedule-builder:schedule-builder /opt/schedule-builder
```

**2. Application Setup**
```bash
# Switch to application user
sudo su - schedule-builder
cd /opt/schedule-builder

# Clone and build
git clone <repository-url> .
cd backend && npm ci --production
cd ../frontend && npm ci --production && npm run build
```

**3. Database Setup**
```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE schedule_builder;
CREATE USER schedule_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE schedule_builder TO schedule_user;
\q
EOF

# Run migrations
cd /opt/schedule-builder/backend
npm run migration:run
```

**4. Process Management (PM2)**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'schedule-builder-backend',
      script: './backend/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'schedule-builder-frontend',
      script: './frontend/.output/server/index.mjs',
      instances: 2,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Load Balancer Configuration

**Nginx Configuration**
```nginx
upstream backend {
    server localhost:3001;
    # Add more backend servers for load balancing
    # server backend2:3001;
    # server backend3:3001;
}

upstream frontend {
    server localhost:3000;
    # Add more frontend servers
    # server frontend2:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000";
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Monitoring and Health Checks

### Application Monitoring

**Health Check Endpoints**
```bash
# Basic health check
curl -f http://localhost:3000/api/health

# Detailed health report
curl http://localhost:3000/api/health/detailed
```

**Expected Health Response**
```json
{
  "status": "healthy",
  "timestamp": 1673024400000,
  "uptime": 86400,
  "performance": {
    "averageResponseTime": 45,
    "errorRate": 0.02,
    "memoryUsage": {
      "heapUsed": 134217728,
      "heapTotal": 201326592,
      "rss": 268435456
    }
  },
  "database": {
    "connected": true,
    "responseTime": 12
  },
  "cache": {
    "hitRate": 0.87,
    "memoryUsage": 67108864
  }
}
```

### System Monitoring Scripts

**Health Check Script**
```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:3000/api/health"
LOG_FILE="/var/log/schedule-builder/health-check.log"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
    echo "$(date): Health check passed" >> $LOG_FILE
    exit 0
else
    echo "$(date): Health check failed with status $response" >> $LOG_FILE
    # Send alert (email, Slack, etc.)
    /opt/schedule-builder/scripts/send-alert.sh "Health check failed"
    exit 1
fi
```

**Performance Monitoring Script**
```bash
#!/bin/bash
# performance-monitor.sh

API_URL="http://localhost:3000/api/health/detailed"
ALERT_THRESHOLD_MEMORY=512000000  # 512MB
ALERT_THRESHOLD_RESPONSE=1000     # 1 second

response=$(curl -s $API_URL)
memory_usage=$(echo $response | jq '.performance.memoryUsage.rss')
avg_response=$(echo $response | jq '.performance.averageResponseTime')

if [ $memory_usage -gt $ALERT_THRESHOLD_MEMORY ]; then
    echo "$(date): High memory usage: $memory_usage bytes"
    /opt/schedule-builder/scripts/send-alert.sh "High memory usage detected"
fi

if [ $avg_response -gt $ALERT_THRESHOLD_RESPONSE ]; then
    echo "$(date): Slow response time: $avg_response ms"
    /opt/schedule-builder/scripts/send-alert.sh "Slow response time detected"
fi
```

### Automated Monitoring Setup

**Crontab Configuration**
```bash
# Edit crontab for application user
sudo crontab -u schedule-builder -e

# Add monitoring jobs
*/5 * * * * /opt/schedule-builder/scripts/health-check.sh
*/15 * * * * /opt/schedule-builder/scripts/performance-monitor.sh
0 */6 * * * /opt/schedule-builder/scripts/log-rotation.sh
0 2 * * * /opt/schedule-builder/scripts/daily-backup.sh
```

**Systemd Health Check Service**
```ini
# /etc/systemd/system/schedule-builder-health.service
[Unit]
Description=Schedule Builder Health Check
After=network.target

[Service]
Type=oneshot
User=schedule-builder
ExecStart=/opt/schedule-builder/scripts/health-check.sh
```

```ini
# /etc/systemd/system/schedule-builder-health.timer
[Unit]
Description=Run Schedule Builder Health Check every 5 minutes
Requires=schedule-builder-health.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

## Database Management

### Backup Procedures

**Automated Daily Backup**
```bash
#!/bin/bash
# daily-backup.sh

BACKUP_DIR="/opt/backups/schedule-builder"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="schedule_builder"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U schedule_user -d $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application data backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /opt/schedule-builder/uploads /opt/schedule-builder/logs

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "$(date): Backup completed - $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

**Database Restore**
```bash
#!/bin/bash
# restore-database.sh

if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE=$1
DB_NAME="schedule_builder"

# Stop application
sudo systemctl stop schedule-builder-backend

# Restore database
gunzip -c $BACKUP_FILE | psql -h localhost -U schedule_user -d $DB_NAME

# Start application
sudo systemctl start schedule-builder-backend

echo "Database restored from $BACKUP_FILE"
```

### Migration Management

**Running Migrations**
```bash
# Production migration process
cd /opt/schedule-builder/backend

# Backup before migration
./scripts/daily-backup.sh

# Run migrations
npm run migration:run

# Verify migration success
npm run migration:show
```

**Migration Rollback**
```bash
# Rollback last migration
npm run migration:revert

# Restore from backup if needed
./scripts/restore-database.sh /opt/backups/schedule-builder/db_backup_YYYYMMDD.sql.gz
```

## Log Management

### Log Configuration

**Application Logs**
```bash
# Log locations
/var/log/schedule-builder/
├── app.log              # Application logs
├── error.log            # Error logs
├── performance.log      # Performance metrics
├── access.log           # HTTP access logs
└── health-check.log     # Health check results
```

**Log Rotation Configuration**
```bash
# /etc/logrotate.d/schedule-builder
/var/log/schedule-builder/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        /bin/kill -HUP `cat /var/run/schedule-builder/app.pid 2> /dev/null` 2> /dev/null || true
    endscript
}
```

### Log Analysis

**Error Monitoring Script**
```bash
#!/bin/bash
# error-monitor.sh

ERROR_LOG="/var/log/schedule-builder/error.log"
ALERT_THRESHOLD=10

# Count errors in last 5 minutes
error_count=$(tail -n 1000 $ERROR_LOG | grep "$(date -d '5 minutes ago' '+%Y-%m-%d %H:%M')" | wc -l)

if [ $error_count -gt $ALERT_THRESHOLD ]; then
    echo "$(date): High error rate detected: $error_count errors in 5 minutes"
    /opt/schedule-builder/scripts/send-alert.sh "High error rate: $error_count errors"
fi
```

**Performance Log Analysis**
```bash
#!/bin/bash
# analyze-performance.sh

PERFORMANCE_LOG="/var/log/schedule-builder/performance.log"

# Average response time in last hour
avg_response=$(tail -n 3600 $PERFORMANCE_LOG | grep "response_time" | awk '{sum+=$5; count++} END {print sum/count}')

echo "Average response time (last hour): ${avg_response}ms"

# Memory usage trend
tail -n 100 $PERFORMANCE_LOG | grep "memory_usage" | awk '{print $1, $2, $5}'
```

## Security Management

### SSL/TLS Certificate Management

**Let's Encrypt Setup**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

**Certificate Monitoring**
```bash
#!/bin/bash
# check-ssl-expiry.sh

DOMAIN="your-domain.com"
DAYS_WARNING=30

expiry_date=$(openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
expiry_seconds=$(date -d "$expiry_date" +%s)
current_seconds=$(date +%s)
days_until_expiry=$(( (expiry_seconds - current_seconds) / 86400 ))

if [ $days_until_expiry -lt $DAYS_WARNING ]; then
    echo "$(date): SSL certificate expires in $days_until_expiry days"
    /opt/schedule-builder/scripts/send-alert.sh "SSL certificate expiring soon"
fi
```

### Firewall Configuration

**UFW Setup**
```bash
# Basic firewall setup
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow specific IPs for admin access
sudo ufw allow from 192.168.1.0/24 to any port 22

# Enable firewall
sudo ufw enable
```

### Security Updates

**Automated Security Updates**
```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades

# Configure automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

**Dependency Security Check**
```bash
#!/bin/bash
# security-audit.sh

cd /opt/schedule-builder/backend
npm audit --audit-level=moderate

cd ../frontend
npm audit --audit-level=moderate

# Update dependencies if needed
# npm audit fix
```

## Backup and Recovery

### Comprehensive Backup Strategy

**Full System Backup**
```bash
#!/bin/bash
# full-backup.sh

BACKUP_DIR="/opt/backups/schedule-builder"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -h localhost -U schedule_user -d schedule_builder | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    /opt/schedule-builder/

# Configuration files
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    /etc/nginx/sites-available/schedule-builder \
    /etc/systemd/system/schedule-builder* \
    /etc/logrotate.d/schedule-builder

# Logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/log/schedule-builder/

echo "$(date): Full backup completed"
```

### Disaster Recovery Plan

**Recovery Procedure**
1. **Assess Damage**
   - Identify failed components
   - Determine data loss extent
   - Prioritize recovery steps

2. **Infrastructure Recovery**
   ```bash
   # Restore server from backup/snapshot
   # Reinstall base system if needed
   
   # Restore application
   cd /opt
   tar -xzf /backup/app_YYYYMMDD.tar.gz
   
   # Restore configuration
   tar -xzf /backup/config_YYYYMMDD.tar.gz -C /
   ```

3. **Database Recovery**
   ```bash
   # Restore database
   sudo -u postgres createdb schedule_builder
   gunzip -c /backup/db_YYYYMMDD.sql.gz | sudo -u postgres psql schedule_builder
   ```

4. **Service Restart**
   ```bash
   # Restart services
   sudo systemctl daemon-reload
   sudo systemctl start schedule-builder-backend
   sudo systemctl start schedule-builder-frontend
   sudo systemctl start nginx
   ```

5. **Verification**
   ```bash
   # Test application functionality
   curl http://localhost:3000/api/health
   
   # Verify data integrity
   # Test user authentication
   # Validate schedule generation
   ```

## Performance Tuning

### Database Optimization

**PostgreSQL Configuration**
```sql
-- /etc/postgresql/14/main/postgresql.conf optimizations

# Memory settings
shared_buffers = 2GB                    # 25% of total RAM
effective_cache_size = 6GB              # 75% of total RAM
work_mem = 32MB                         # Per connection
maintenance_work_mem = 512MB

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Performance settings
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD storage
```

**Index Optimization**
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_lessons_schedule_day 
ON lessons(schedule_id, day_of_week);

CREATE INDEX CONCURRENTLY idx_courses_teacher 
ON courses(teacher_id) WHERE teacher_id IS NOT NULL;

-- Analyze table statistics
ANALYZE courses, teachers, groups, lessons, schedules;
```

### Application Performance

**Node.js Optimization**
```bash
# PM2 production configuration
pm2 start ecosystem.config.js --env production

# Enable cluster mode for CPU utilization
pm2 scale schedule-builder-backend 4

# Monitor performance
pm2 monit
```

**Memory Optimization**
```javascript
// Garbage collection tuning
node --max-old-space-size=4096 --optimize-for-size app.js

// Enable V8 performance flags
node --enable-precise-memory-info --expose-gc app.js
```

### Caching Strategy

**Redis Configuration** (if used)
```bash
# /etc/redis/redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Troubleshooting

### Common Issues and Solutions

**1. High Memory Usage**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Identify memory leaks
node --inspect app.js
# Use Chrome DevTools to analyze heap

# Restart services if needed
pm2 restart all
```

**2. Database Connection Issues**
```bash
# Check database status
sudo systemctl status postgresql

# Check connection limits
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Increase connection pool if needed
# Edit backend/.env
DB_CONNECTION_POOL_SIZE=50
```

**3. Slow Schedule Generation**
```bash
# Check system resources
top -p $(pgrep -f schedule-builder)

# Enable debug logging
DEBUG=schedule:* npm start

# Analyze performance bottlenecks
curl http://localhost:3000/api/health/performance
```

**4. WebSocket Connection Problems**
```bash
# Check nginx websocket configuration
nginx -t

# Test websocket connectivity
wscat -c ws://localhost:3001/socket.io/

# Monitor websocket connections
netstat -an | grep :3001
```

### Emergency Procedures

**Service Recovery**
```bash
#!/bin/bash
# emergency-restart.sh

echo "$(date): Emergency restart initiated"

# Stop services gracefully
pm2 stop all
sudo systemctl stop nginx

# Wait for graceful shutdown
sleep 10

# Force kill if needed
pkill -f schedule-builder

# Restart services
sudo systemctl start nginx
pm2 start ecosystem.config.js

# Verify services
sleep 5
curl -f http://localhost:3000/api/health || echo "Health check failed"

echo "$(date): Emergency restart completed"
```

**Database Emergency Recovery**
```bash
#!/bin/bash
# emergency-db-recovery.sh

# Stop application to prevent data corruption
pm2 stop schedule-builder-backend

# Check database status
sudo systemctl status postgresql

# Restart database if needed
sudo systemctl restart postgresql

# Run database integrity check
sudo -u postgres psql schedule_builder -c "SELECT pg_database_size('schedule_builder');"

# Restore from latest backup if corrupted
if [ $? -ne 0 ]; then
    echo "Database corrupted, restoring from backup"
    ./scripts/restore-database.sh /opt/backups/schedule-builder/db_$(date +%Y%m%d)*.sql.gz
fi

# Restart application
pm2 start schedule-builder-backend
```

## Contact and Support

### Emergency Contacts

**Development Team**
- Primary Developer: developer@company.com
- DevOps Engineer: devops@company.com
- System Administrator: admin@company.com

**Escalation Procedures**
1. Check application logs and health endpoints
2. Attempt basic troubleshooting steps
3. Contact primary developer for application issues
4. Contact DevOps engineer for infrastructure issues
5. Contact system administrator for server-level issues

### Support Procedures

**Creating Support Tickets**
1. **Issue Description**: Detailed problem description
2. **Error Messages**: Complete error logs
3. **Reproduction Steps**: How to reproduce the issue
4. **Environment**: Production/staging environment details
5. **Impact**: User impact and business criticality
6. **Timeline**: When the issue started

**Log Collection for Support**
```bash
#!/bin/bash
# collect-support-logs.sh

SUPPORT_DIR="/tmp/schedule-builder-support-$(date +%Y%m%d_%H%M%S)"
mkdir -p $SUPPORT_DIR

# Application logs
cp -r /var/log/schedule-builder/ $SUPPORT_DIR/

# System information
uname -a > $SUPPORT_DIR/system-info.txt
free -h >> $SUPPORT_DIR/system-info.txt
df -h >> $SUPPORT_DIR/system-info.txt

# Service status
systemctl status schedule-builder-* > $SUPPORT_DIR/service-status.txt
pm2 status > $SUPPORT_DIR/pm2-status.txt

# Database status
sudo -u postgres psql -c "\l" > $SUPPORT_DIR/db-status.txt

# Create archive
tar -czf schedule-builder-support-$(date +%Y%m%d_%H%M%S).tar.gz $SUPPORT_DIR/

echo "Support package created: schedule-builder-support-$(date +%Y%m%d_%H%M%S).tar.gz"
```

This operations guide provides comprehensive procedures for managing the Schedule Builder application in production environments. Regular review and updates of these procedures ensure optimal system performance and reliability."