# Getting Started with AAJA Live

## Installation

### Prerequisites
- Node.js 18+ and Yarn
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (optional)

### Step 1: Clone & Install
```bash
cd aaja-live
yarn install
```

### Step 2: Environment Setup
```bash
cp .env.example .env

# Edit .env with your values:
# - DATABASE_URL=postgresql://user:password@localhost:5432/aaja_live
# - REDIS_URL=redis://localhost:6379
# - JWT_SECRET=your-secret-key
# - STRIPE_SECRET_KEY=sk_test_xxxxx (from Stripe dashboard)
```

### Step 3: Start Services

**Option A: Docker Compose (Recommended)**
```bash
docker-compose -f infrastructure/docker/docker-compose.yml up
```
This starts PostgreSQL, Redis, Nginx, and the app on localhost:80

**Option B: Manual Setup**
```bash
# Terminal 1: PostgreSQL
# Make sure PostgreSQL is running

# Terminal 2: Redis
redis-server

# Terminal 3: Frontend
yarn workspace aaja-live-client dev
# Open http://localhost:5173

# Terminal 4: Backend
NODE_ENV=development yarn workspace aaja-live-server dev
# Backend runs on http://localhost:3000
```

### Step 4: Test Installation
```bash
# Health check
curl http://localhost:3000/health

# Frontend
curl http://localhost:5173

# Or visit: http://localhost:5173 in your browser
```

---

## Development Workflow

### Common Commands
```bash
# Development (frontend + backend)
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Linting
yarn lint

# Type checking
yarn type-check

# Testing
yarn test
```

### Frontend Development
```bash
cd client

# Start dev server (http://localhost:5173)
yarn dev

# Build production bundle
yarn build

# Type check
yarn type-check

# Run tests
yarn test
```

### Backend Development
```bash
cd server

# Start dev server (http://localhost:3000)
yarn dev

# Build TypeScript
yarn build

# Run migrations
yarn db:migrate

# Seed test data
yarn db:seed

# Run tests
yarn test
```

### File Changes Watch
```bash
# Auto-rebuild on changes
yarn workspace aaja-live-client build --watch
yarn workspace aaja-live-server build --watch
```

---

## Architecture Overview

### Frontend
- **Main entry**: `client/src/main.tsx`
- **Components**: `client/src/pages/`
- **State**: `client/src/store/` (Zustand)
- **Real-time**: `client/src/hooks/useSignaling.ts`
- **WebRTC**: `client/src/hooks/useWebRTC.ts`

### Backend
- **Server**: `server/src/index.ts`
- **Routes**: `server/src/api/routes.ts`
- **Services**: `server/src/services/`
  - `matchmaking.ts` - Matching algorithm
  - `signaling.ts` - WebSocket handling
  - `payment.ts` - Stripe integration
  - `moderation.ts` - AI safety
- **Database**: `server/src/database/` (TypeORM)
- **Models**: `server/src/models/entities.ts`

### Project Structure
```
aaja-live/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Home, Chat, Profile, Pricing
│   │   ├── hooks/         # WebRTC, Signaling, Media
│   │   ├── store/         # State management
│   │   ├── types/         # TypeScript types
│   │   └── styles/        # Tailwind CSS
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── api/           # Express routes
│   │   ├── services/      # Business logic
│   │   ├── database/      # TypeORM setup
│   │   ├── models/        # Entities
│   │   ├── config/        # Configuration
│   │   └── index.ts       # Entry point
│   └── package.json
│
├── infrastructure/        # Docker & K8s
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── nginx.conf
│   └── kubernetes/
│       ├── deployment.yaml
│       ├── database.yaml
│       └── ingress.yaml
│
└── docs/                 # Documentation
    ├── README.md
    ├── ARCHITECTURE.md
    ├── WEBRTC.md
    └── DEPLOYMENT.md
```

---

## Key Features

### Matchmaking
- Sub-500ms algorithm running every 500ms
- Compatibility scoring (mode, gender, region, interests)
- Wait time prioritization
- Queue stored in Redis

### WebRTC
- Peer-to-peer video/audio
- STUN/TURN fallback
- Automatic ICE candidate exchange
- Connection state monitoring

### Moderation
- Real-time frame sampling (every 5s)
- NSFW detection via TensorFlow.js
- Automatic blur/disconnect
- Violation logging & reputation scoring

### Payments
- Stripe integration
- Premium tier features
- Webhook handling
- Secure transaction logging

---

## API Endpoints

### Users
```
POST   /api/users/register              # Create anonymous user
GET    /api/users/:userId               # Get profile
PUT    /api/users/:userId/preferences   # Update preferences
GET    /api/users/:userId/stats         # Get statistics
```

### Matchmaking
```
POST   /api/matching/join               # Join queue
POST   /api/matching/leave              # Leave queue
GET    /api/matching/stats              # Queue stats
```

### Payments
```
POST   /api/payments/checkout           # Create checkout session
POST   /api/webhooks/stripe             # Stripe webhook
GET    /api/payments/verify             # Verify payment status
```

---

## WebSocket Events

### Client → Server
```
user:join                 # { userId, preferences }
user:leave               # { userId }
user:skip                # { userId, sessionId }
signaling:offer          # { from, to, offer, sessionId }
signaling:answer         # { from, to, answer, sessionId }
signaling:ice-candidate  # { from, to, candidate }
call:ended               # { sessionId, reason }
```

### Server → Client
```
match:found              # { userId, matchId, sessionId }
user:connected           # { userId }
user:ready               # (ready for new match)
signaling:offer          # (receive offer)
signaling:answer         # (receive answer)
signaling:ice-candidate  # (receive candidate)
call:ended               # { sessionId, reason }
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 yarn workspace aaja-live-server dev
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
psql -U aaja -d aaja_live -c "SELECT 1;"

# Check connection string in .env
# Format: postgresql://user:password@host:port/database
```

### Redis Connection Error
```bash
# Verify Redis is running
redis-cli ping
# Should return: PONG

# Check Redis URL in .env
# Format: redis://host:port
```

### WebSocket Connection Failed
```bash
# Check backend is running on port 3000
curl http://localhost:3000/health

# Check frontend is configured correctly
# VITE_API_URL in .env or vite.config.ts
```

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
yarn install

# Clear TypeScript cache
rm -rf tsconfig.tsbuildinfo
yarn build
```

---

## Performance Tips

### Frontend Optimization
- Images: Use WebP format
- Code splitting: Vite handles automatically
- Bundle size: Check with `yarn build` output
- DevTools: Use React DevTools extension

### Backend Optimization
- Use connection pooling for database
- Redis caching for hot data
- Enable gzip compression
- Monitor with `yarn workspace aaja-live-server start` + monitoring tools

### Database
- Indexes on frequently queried columns (already configured)
- Periodic VACUUM and ANALYZE
- Regular backups
- Connection pool tuning

---

## Testing

### Unit Tests
```bash
# Frontend
yarn workspace aaja-live-client test

# Backend
yarn workspace aaja-live-server test

# Watch mode
yarn test --watch
```

### Integration Tests
```bash
# Requires database setup
DATABASE_URL=postgresql://aaja:password@localhost/aaja_live \
REDIS_URL=redis://localhost:6379 \
yarn workspace aaja-live-server test:integration
```

### Load Testing
```bash
# Using Artillery
npm install -g artillery

artillery quick --count 100 --num 1000 http://localhost:3000/health
```

---

## Production Deployment

### Using Docker Compose
```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

### Using Kubernetes
```bash
kubectl apply -f infrastructure/kubernetes/database.yaml
kubectl apply -f infrastructure/kubernetes/deployment.yaml
kubectl apply -f infrastructure/kubernetes/ingress.yaml
```

### Environment Setup
1. Copy `.env.example` → `.env`
2. Update all secrets and keys
3. Configure domain & SSL certificates
4. Set up backups & monitoring
5. Configure load balancing

---

## Security Checklist

- ✅ Update environment variables
- ✅ Enable HTTPS (Let's Encrypt)
- ✅ Configure firewall rules
- ✅ Setup rate limiting
- ✅ Enable CORS properly
- ✅ Rotate secrets monthly
- ✅ Setup database backups
- ✅ Enable audit logging
- ✅ Configure security headers
- ✅ Setup intrusion detection

---

## Support & Documentation

- **Architecture**: See `docs/ARCHITECTURE.md`
- **WebRTC**: See `docs/WEBRTC.md`
- **Deployment**: See `docs/DEPLOYMENT.md`
- **Main README**: See `docs/README.md`

---

**Happy coding! 🚀**

For issues, check existing errors or create an issue on GitHub.
