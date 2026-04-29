# Deployment Guide

## Prerequisites

- Domain name configured with DNS
- SSL/TLS certificate (Let's Encrypt)
- Cloud provider account (AWS, GCP, Azure, or self-hosted)
- kubectl configured for Kubernetes
- Docker registry credentials

## Environment Setup

### 1. Create Namespace
```bash
kubectl create namespace production
```

### 2. Create Secrets
```bash
kubectl create secret generic aaja-secrets \
  --from-literal=DATABASE_PASSWORD=your-secure-password \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxxxx \
  -n production
```

### 3. Create ConfigMap
```bash
kubectl create configmap aaja-config \
  --from-literal=NODE_ENV=production \
  --from-literal=CORS_ORIGIN=https://aaja-live.com \
  -n production
```

## Deployment Steps

### Option A: Kubernetes (Recommended)

```bash
# 1. Apply database and infrastructure
kubectl apply -f infrastructure/kubernetes/database.yaml

# 2. Wait for database readiness
kubectl wait --for=condition=ready pod -l app=postgres -n production --timeout=300s

# 3. Deploy application
kubectl apply -f infrastructure/kubernetes/deployment.yaml

# 4. Setup ingress and TLS
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# 5. Verify deployment
kubectl get pods -n production
kubectl get svc -n production
```

### Option B: Docker Compose

```bash
# 1. Clone repository
git clone <repo>
cd aaja-live

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Start services
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# 4. Verify services
docker-compose ps
```

### Option C: Manual VM Deployment

```bash
# 1. SSH into server
ssh user@server.ip

# 2. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql redis-server nginx

# 3. Clone and build
git clone <repo>
cd aaja-live
yarn install
yarn build

# 4. Start application
NODE_ENV=production yarn start
```

## SSL/TLS Configuration

### Let's Encrypt with Kubernetes
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: aaja-tls
  namespace: production
spec:
  secretName: aaja-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - aaja-live.com
  - www.aaja-live.com
```

### Nginx Configuration
```nginx
server {
  listen 443 ssl http2;
  server_name aaja-live.com;

  ssl_certificate /etc/letsencrypt/live/aaja-live.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/aaja-live.com/privkey.pem;
  
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
}
```

## Database Initialization

### PostgreSQL Migration
```bash
# Create database
createdb -U aaja aaja_live

# Run migrations
yarn workspace server run db:migrate

# Seed data (optional)
yarn workspace server run db:seed
```

## Scaling Configuration

### Horizontal Scaling (Kubernetes)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aaja-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aaja-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Connection Pooling
```bash
# PostgreSQL (pgBouncer)
sudo apt-get install pgbouncer

# Configure pooling
echo "aaja_live = host=localhost port=5432 user=aaja password=xxx" | sudo tee -a /etc/pgbouncer/pgbouncer.ini
```

## Monitoring & Logging

### Prometheus Setup
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: production
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'aaja-app'
      static_configs:
      - targets: ['aaja-app:9090']
```

### ELK Stack (Elasticsearch, Logstash, Kibana)
```bash
# Deploy ELK
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n production
helm install kibana elastic/kibana -n production
```

### Log Aggregation
```typescript
// Server logging
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino/file',
    options: { destination: '/var/log/aaja/app.log' }
  }
});
```

## Backup & Disaster Recovery

### PostgreSQL Backup
```bash
# Daily backup
0 2 * * * pg_dump -U aaja aaja_live | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Restore from backup
gunzip < /backups/db-20240101.sql.gz | psql -U aaja aaja_live
```

### Redis Backup
```bash
# Enable RDB persistence in redis.conf
save 900 1
save 300 10
save 60 10000

# Backup
cp /var/lib/redis/dump.rdb /backups/redis-$(date +%Y%m%d).rdb
```

### Cloud Backup Services
- AWS S3 for file backups
- RDS automated backups for PostgreSQL
- ElastiCache for Redis snapshots

## Performance Tuning

### Node.js Optimization
```bash
# Increase file descriptors
ulimit -n 65535

# Enable clustering
NODE_CLUSTER_SIZE=4 yarn start
```

### PostgreSQL Tuning
```sql
-- Increase shared buffers (25% of available RAM)
ALTER SYSTEM SET shared_buffers = '4GB';

-- Tune work memory
ALTER SYSTEM SET work_mem = '16MB';

-- Enable query parallelization
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Reload configuration
SELECT pg_reload_conf();
```

### Redis Optimization
```bash
# maxclients
redis-cli CONFIG SET maxclients 100000

# maxmemory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Enable appendonly (persistence)
redis-cli CONFIG SET appendonly yes
```

## Security Hardening

### Firewall Rules
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
```

### Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=50r/s;

location /api/ {
  limit_req zone=api burst=10 nodelay;
}
```

### API Key Rotation
```bash
# Rotate JWT secret monthly
NODE_ENV=production JWT_SECRET=new-secret yarn start

# Update Stripe keys in CI/CD
export STRIPE_SECRET_KEY=sk_live_newkey
```

## Health Checks

```bash
# Application health
curl https://aaja-live.com/health

# Database health
kubectl exec -it postgres-0 -n production -- pg_isready

# Redis health
kubectl exec -it redis-0 -n production -- redis-cli ping

# Kubernetes status
kubectl get nodes -n production
kubectl top nodes
kubectl top pods -n production
```

## Rollout & Rollback

### Kubernetes Rolling Update
```bash
# Check current deployment
kubectl rollout status deployment/aaja-app -n production

# Rollback to previous version
kubectl rollout undo deployment/aaja-app -n production

# Check rollout history
kubectl rollout history deployment/aaja-app -n production
```

## Cost Optimization

- Use spot instances for non-critical workloads
- Configure auto-scaling policies
- Optimize image sizes (multi-stage Docker builds)
- Use CDN for static assets
- Enable database query caching

---

For production support, contact: ops@aaja-live.com
