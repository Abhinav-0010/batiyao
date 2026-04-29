# WebRTC Implementation Guide

## Connection Flow

```
User A                              User B
  │                                   │
  ├─ Register & Get Pseudonym        │
  │                                   │
  ├─ Connect to Signaling (WebSocket)│
  │                                   │
  ├─ Join Matchmaking Queue  ◄────── ├─ Join Matchmaking Queue
  │                                   │
  ├◄──────── Match Found ────────────►│
  │                                   │
  ├─ Create PeerConnection           │
  ├─ Get Local Stream (Video/Audio)  ├─ Create PeerConnection
  │                                   ├─ Get Local Stream
  ├─ Create WebRTC Offer             │
  ├─────── Signaling: Offer ────────►│
  │                                   ├─ Set Remote Description
  │                                   ├─ Create WebRTC Answer
  │◄────── Signaling: Answer ────────┤
  ├─ Set Remote Description          │
  │                                   │
  ├─────────── ICE Candidates ──────►│
  │                                   │
  │◄──────── ICE Candidates ─────────┤
  │                                   │
  ├─ P2P Video/Audio Stream          │
  │ ◄────────────────────────────────►│
  │                                   │
  ├ (Active Call)                     │
  │ (Moderation checks every 5s)      │
  │                                   │
  ├─────────── Skip Call ────────────►│
  ├─ Close Peer Connection           │
  ├─────────── New Match ────────────►│
```

## WebRTC Configuration

### STUN Servers (Free)
```javascript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];
```

### TURN Servers (Fallback)
For deployments, configure TURN servers for NAT/Firewall traversal:
```javascript
{
  urls: ['turn:turnserver.example.com:3478'],
  username: 'user',
  credential: 'password',
  credentialType: 'password'
}
```

## Peer Connection Setup

```typescript
const config: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

const peerConnection = new RTCPeerConnection(config);
```

## Media Constraints

```typescript
// Video constraints for 720p
const videoConstraints: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
};

// Audio constraints with noise suppression
const audioConstraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
```

## Signaling Protocol

### Offer Exchange
```json
{
  "type": "signaling:offer",
  "from": "user-1",
  "to": "user-2",
  "sessionId": "session-123",
  "offer": {
    "type": "offer",
    "sdp": "v=0\no=... (SDP content)"
  }
}
```

### Answer Exchange
```json
{
  "type": "signaling:answer",
  "from": "user-2",
  "to": "user-1",
  "sessionId": "session-123",
  "answer": {
    "type": "answer",
    "sdp": "v=0\no=... (SDP content)"
  }
}
```

### ICE Candidates
```json
{
  "type": "signaling:ice-candidate",
  "from": "user-1",
  "to": "user-2",
  "candidate": {
    "candidate": "candidate:... (ICE candidate)",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

## Error Handling

```typescript
peerConnection.onerror = (error) => {
  console.error('PeerConnection error:', error);
  // Handle connection errors
};

try {
  const offer = await peerConnection.createOffer();
} catch (error) {
  if (error.name === 'InvalidStateError') {
    // Connection state invalid
  } else if (error.name === 'InternalError') {
    // Browser error
  }
}
```

## Connection States

```typescript
// Connection State
console.log(peerConnection.connectionState);
// "new" | "connecting" | "connected" | "disconnected" | "failed" | "closed"

// ICE Connection State
console.log(peerConnection.iceConnectionState);
// "new" | "checking" | "connected" | "completed" | "failed" | "disconnected" | "closed"

// ICE Gathering State
console.log(peerConnection.iceGatheringState);
// "new" | "gathering" | "complete"
```

## Performance Monitoring

```typescript
// Get connection statistics
const stats = await peerConnection.getStats();

stats.forEach(report => {
  if (report.type === 'inbound-rtp') {
    console.log('Inbound:', {
      bytesReceived: report.bytesReceived,
      packetsLost: report.packetsLost,
      jitter: report.jitter,
    });
  }
  if (report.type === 'outbound-rtp') {
    console.log('Outbound:', {
      bytesSent: report.bytesSent,
      framesSent: report.framesSent,
      frameRate: report.framesPerSecond,
    });
  }
  if (report.type === 'candidate-pair' && report.state === 'succeeded') {
    console.log('Connection:', {
      currentRoundTripTime: report.currentRoundTripTime * 1000, // ms
      availableOutgoingBitrate: report.availableOutgoingBitrate / 1000, // kbps
    });
  }
});
```

## Network Resilience

### Handling Connection Drops
```typescript
peerConnection.onconnectionstatechange = () => {
  if (peerConnection.connectionState === 'disconnected') {
    // Attempt reconnection
    attemptReconnection();
  } else if (peerConnection.connectionState === 'failed') {
    // Connection failed, trigger new match
    findNewMatch();
  }
};
```

### Bandwidth Adaptation
```typescript
// Monitor bandwidth and adapt quality
const monitorBandwidth = async () => {
  const stats = await peerConnection.getStats();
  
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      const bitrate = (report.bytesReceived * 8) / report.timestamp;
      
      if (bitrate < 500000) {
        // Switch to 360p
        adjustVideoQuality('360p');
      } else if (bitrate > 2000000) {
        // Switch to 720p
        adjustVideoQuality('720p');
      }
    }
  });
};
```
