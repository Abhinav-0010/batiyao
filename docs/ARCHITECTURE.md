# Architecture & Design Decisions

## System Architecture Overview

AAJA Live is built on a modern, scalable microservices architecture designed to handle:
- 100k+ concurrent users
- Sub-500ms matchmaking latency
- <2s WebRTC connection setup
- 99.9% uptime SLA

### Core Components

```
┌──────────────────────────────────────────────────────────┐
│                    CDN / Load Balancer                    │
│                    (Geographic Routing)                   │
└──────────────────────────────────────────────────────────┘
         │
         │ HTTPS + WSS
         ▼
┌──────────────────────────────────────────────────────────┐
│               Nginx Reverse Proxy                         │
│      (SSL Termination, Rate Limiting, Routing)           │
└──────────────────────────────────────────────────────────┘
         │
         ├─────────────────────────┬────────────────────────┤
         │                         │                        │
    REST API              WebSocket Signaling          Static Assets
         ▼                         ▼                        ▼
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
│  Express Server  │  │ Socket.io Server     │  │   React Static   │
│  (Node.js)       │  │ (Real-time Events)   │  │   (Built SPA)    │
└──────────────────┘  └──────────────────────┘  └──────────────────┘
         │                        │
         │         ┌──────────────┼──────────────┐
         │         │              │              │
         ▼         ▼              ▼              ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │PostgreSQL│  │  Redis   │  │  Stripe  │  │ TensorFlow.js│
    │Persistence  │(Sessions │  │(Payments)│  │(AI Moderation│
    │         │  │Matchmaking   │          │  │ - Browser)   │
    └─────────┘  └──────────┘  └──────────┘  └──────────────┘
```

## Matchmaking Algorithm

### Queue Structure (Redis)
```
Sorted Set: "matching_queue"
├── Member: user_id_1
├── Score: timestamp_joined_1
├── Member: user_id_2
├── Score: timestamp_joined_2
└── ...

Hash: "user_preferences:user_id"
{
  mode: "random|mood|interest",
  genderFilter: "any|male|female|non-binary",
  regionFilter: ["US", "CA", "MX"],
  interests: ["gaming", "music", "travel"],
  moodFilter: "chill|deep-talk|fun"
}
```

### Matching Logic
```
For each user in queue (ordered by join time):
  For each other user in queue:
    1. Calculate compatibility score:
       - Mode match: 1.0 if same, 0.8 if different
       - Gender compatibility: 1.0 if compatible, 0.0 if not
       - Region overlap: 1.0 if overlap, 0.7 if not
       - Interest overlap: 0.8 + (common_interests / total_interests) * 0.2
       - Wait time bonus: +0.1 for users waiting >60s

    2. If compatibility > 0.6:
       - Create session (sessionId)
       - Remove both users from queue
       - Emit "match:found" event to both
       - Store session in Redis with 1h TTL

Interval: Run matching every 500ms
```

### Expected Matching Times
- 1 user in queue: ~5-10s
- 10-50 users: <500ms
- 100+ users: <100ms

## WebRTC Peer-to-Peer Architecture

### Signaling Flow

```
1. User A connects, gets socket_id_1
2. User B connects, gets socket_id_2
3. Matchmaking finds pair
4. Emit "match:found" to both

5. User A:
   - Creates RTCPeerConnection
   - Gets local MediaStream (video + audio)
   - createOffer() → SDP offer
   - setLocalDescription(offer)
   - Emit "signaling:offer" via WebSocket

6. Server (signaling service):
   - Receives offer from socket_id_1
   - Looks up matched user (socket_id_2)
   - Forwards "signaling:offer" to socket_id_2

7. User B:
   - Receives offer
   - Creates RTCPeerConnection
   - Gets local MediaStream
   - setRemoteDescription(offer)
   - createAnswer() → SDP answer
   - setLocalDescription(answer)
   - Emit "signaling:answer" via WebSocket

8. Server:
   - Receives answer from socket_id_2
   - Forwards to socket_id_1

9. User A:
   - Receives answer
   - setRemoteDescription(answer)
   - Connection established (media flows)

10. Both users (continuous):
    - Exchange ICE candidates
    - Monitor connection quality
    - Collect stats every 1s
```

### Connection State Machine

```
         ┌─────────────────────────────────────────────────┐
         │              Idle (Waiting Match)               │
         └────────────────┬────────────────────────────────┘
                          │ Match found
                          ▼
         ┌─────────────────────────────────────────────────┐
         │         Connecting (Offer/Answer)               │
         └────────────────┬────────────────────────────────┘
                          │ Media established
                          ▼
         ┌─────────────────────────────────────────────────┐
         │     Active (Video/Audio Flowing)                │
         │  (Moderation & Stats Collection)                │
         └────────────────┬────────────────────────────────┘
                 │        │        │
         Skip    │ Report │ Timeout
         (3s)    │ Abuse  │ (60s)
                 ▼        ▼        ▼
         ┌─────────────────────────────────────────────────┐
         │      Ending (Cleanup & New Match)               │
         └────────────────┬────────────────────────────────┘
                          │
                          ▼
         ┌─────────────────────────────────────────────────┐
         │        Queue (For Next Match)                   │
         └─────────────────────────────────────────────────┘
```

## Moderation Pipeline

### Real-Time Frame Analysis

```
Every 5 seconds (during active call):

1. Browser:
   - Sample video frame from local stream
   - Canvas.toBlob() (JPEG compressed)
   - Send to TensorFlow.js NSFW detector
   - Get confidence score [0-1]

2. If confidence > threshold (0.6):
   - Send alert to backend
   - Backend logs violation
   - Increment user violation counter

3. Actions:
   - score 0.6-0.8: Blur video on both ends
   - score > 0.8: Auto-disconnect + report

4. Dashboard:
   - ⚠️ Yellow warning
   - 🛑 Red danger & disconnect
```

### Violation Scoring

```
User Violation Count:
├── 1 violation: Warning + blur (24h timeout)
├── 2 violations: 48h chat ban
├── 3 violations: 7-day ban + manual review
└── 4+ violations: Permanent ban + reports to authorities
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  pseudonym VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'idle',
  tier VARCHAR(20) DEFAULT 'free',
  reputation INTEGER DEFAULT 0,
  total_chats INTEGER DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_tier ON users(tier);
```

### Chat Sessions Table
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  initiator_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  mode VARCHAR(50) DEFAULT 'random',
  duration INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,

  FOREIGN KEY (initiator_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_sessions_created ON chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_flagged ON chat_sessions(is_flagged);
```

### Moderation Logs Table
```sql
CREATE TABLE moderation_logs (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id),
  type VARCHAR(50) NOT NULL,  -- 'nsfw', 'abuse', 'spam'
  confidence FLOAT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moderation_created ON moderation_logs(created_at DESC);
```

## Performance Considerations

### Caching Strategy

```
Cache Layer (Redis):
├── User Sessions: user:*
├── Match Queue: matching_queue
├── Active Connections: socket:*
├── User Preferences: preferences:*
├── Session Data: session:*
│   ├── 1-hour TTL (active calls only)
│   └── Auto-cleanup on disconnect
└── Reputation Cache: reputation:*
    └── 24-hour TTL
```

### Database Optimization

```
Queries:
├── SELECT * FROM users WHERE id = $1
│   └── Cache hit rate: >95%
├── SELECT * FROM chat_sessions WHERE created_at > NOW() - interval '24 hours'
│   └── Partition by month
└── SELECT COUNT(*) FROM moderation_logs WHERE session_id = $1
    └── Aggregate in Redis

Connection Pool:
├── Min connections: 10
├── Max connections: 50
├── Connection timeout: 5s
└── Idle timeout: 30s
```

### Network Optimization

```
Compression:
├── GZIP on all text responses
├── Brotli for high-traffic endpoints
└── Image optimization for CDN

WebSocket Optimization:
├── Message batching (queue frames)
├── Binary protocol for ICE candidates
├── Compression for large SDPs
└── Heartbeat every 25s (prevent NAT timeout)
```

## Security Model

### Authentication
- Anonymous (no login required)
- Ephemeral session tokens
- JWT issued on connection (valid 7 days)
- Refresh tokens for long-term users

### Data Protection
- TLS 1.3 for all transport
- End-to-end encryption for signaling (optional)
- No sensitive data in logs
- Automatic data purge (30 days)

### Rate Limiting
```
Endpoints:
├── /api/users/register: 100 req/min per IP
├── /api/matching/join: 50 req/min per user
├── /api/users/{id}/stats: 1000 req/min per IP
└── WebSocket events: 500 events/min per connection
```

## Monitoring & Observability

### Metrics Collected
```
Application:
├── Matchmaking latency (p50, p95, p99)
├── WebRTC connection setup time
├── Call duration distribution
├── User retention by cohort
└── Revenue per user

System:
├── CPU usage per pod
├── Memory usage (RSS, Heap)
├── Database query latency
├── Redis operation latency
└── Network bandwidth

Business:
├── Active users by region
├── Conversion rate (Free → Premium)
├── Churn rate
├── Customer acquisition cost
└── Support tickets
```

### Alerting Thresholds
```
Critical:
├── Matchmaking latency > 1000ms (alert)
├── Service downtime > 1m (page)
├── Database connection pool exhausted (page)
└── Error rate > 5% (alert)

Warning:
├── Matchmaking latency > 700ms (warn)
├── P99 response time > 2s (warn)
├── Disk usage > 80% (warn)
└── Memory usage > 85% (warn)
```

---

This architecture is designed for scalability, reliability, and user privacy. Each component is independently scalable and can be replaced/upgraded without affecting others.
