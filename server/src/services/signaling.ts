import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'redis';
import type { SignalingMessage, SocketEvents } from '../types/api.js';

export class SignalingService {
  private io: SocketIOServer;
  private redis: Redis;
  private userSessions: Map<string, string> = new Map(); // userId -> sessionId

  constructor(io: SocketIOServer, redis: Redis) {
    this.io = io;
    this.redis = redis;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`👤 Client connected: ${socket.id}`);

      socket.on('user:join', this.handleUserJoin.bind(this, socket));
      socket.on('user:leave', this.handleUserLeave.bind(this, socket));
      socket.on('user:skip', this.handleUserSkip.bind(this, socket));
      socket.on('signaling:offer', this.handleOffer.bind(this, socket));
      socket.on('signaling:answer', this.handleAnswer.bind(this, socket));
      socket.on('signaling:ice-candidate', this.handleICECandidate.bind(this, socket));
      socket.on('call:ended', this.handleCallEnded.bind(this, socket));
      socket.on('disconnect', this.handleDisconnect.bind(this, socket));
    });
  }

  private async handleUserJoin(socket: Socket, data: any): Promise<void> {
    const userId = data.userId;
    socket.data.userId = userId;

    await this.redis.setEx(`socket:${userId}`, 3600, socket.id);
    console.log(`✅ User ${userId} joined from socket ${socket.id}`);

    // Notify server about user presence
    this.io.emit('user:connected', { userId });
  }

  private async handleUserLeave(socket: Socket, data: any): Promise<void> {
    const userId = data.userId;
    await this.redis.del(`socket:${userId}`);
    console.log(`👋 User ${userId} left`);
  }

  private async handleUserSkip(socket: Socket, data: any): Promise<void> {
    const { userId, sessionId } = data;
    
    // Find matched user
    const matchData = await this.redis.get(`session:${sessionId}`);
    if (matchData) {
      const match = JSON.parse(matchData);
      const matchedUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
      
      // Notify matched user
      const matchedSocketId = await this.redis.get(`socket:${matchedUserId}`);
      if (matchedSocketId) {
        this.io.to(matchedSocketId).emit('call:ended', {
          sessionId,
          reason: 'skip',
        });
      }
    }

    socket.emit('user:ready');
  }

  private async handleOffer(socket: Socket, data: any): Promise<void> {
    const { from, to, offer, sessionId } = data;

    const toSocketId = await this.redis.get(`socket:${to}`);
    if (toSocketId) {
      this.io.to(toSocketId).emit('signaling:offer', {
        from,
        offer,
        sessionId,
      });
    }
  }

  private async handleAnswer(socket: Socket, data: any): Promise<void> {
    const { from, to, answer, sessionId } = data;

    const toSocketId = await this.redis.get(`socket:${to}`);
    if (toSocketId) {
      this.io.to(toSocketId).emit('signaling:answer', {
        from,
        answer,
        sessionId,
      });
    }
  }

  private async handleICECandidate(socket: Socket, data: any): Promise<void> {
    const { from, to, candidate } = data;

    const toSocketId = await this.redis.get(`socket:${to}`);
    if (toSocketId) {
      this.io.to(toSocketId).emit('signaling:ice-candidate', {
        from,
        candidate,
      });
    }
  }

  private async handleCallEnded(socket: Socket, data: any): Promise<void> {
    const { sessionId, reason } = data;
    console.log(`📞 Call ended: ${sessionId} (reason: ${reason})`);

    // Clean up session
    await this.redis.del(`session:${sessionId}`);
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId;
    if (userId) {
      await this.redis.del(`socket:${userId}`);
      console.log(`🔌 User ${userId} disconnected`);
    }
  }

  async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    const toSocketId = await this.redis.get(`socket:${message.to}`);
    if (toSocketId) {
      this.io.to(toSocketId).emit('signaling', message);
    }
  }

  async getConnectedUsers(): Promise<number> {
    return this.io.engine.clientsCount;
  }
}
