import { User, ChatSession, MatchmakingPreferences, ModerationFlag, PaymentEvent } from './index.js';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth
export interface AuthPayload {
  userId: string;
  pseudonym: string;
  tier: string;
}

export interface JWTPayload extends AuthPayload {
  iat: number;
  exp: number;
}

// WebSocket Events
export interface SocketEvents {
  'user:join': { userId: string; preferences: MatchmakingPreferences };
  'user:leave': { userId: string };
  'user:skip': { userId: string; sessionId: string };
  'match:found': { userId: string; matchId: string; sessionId: string };
  'signaling:offer': SignalingOffer;
  'signaling:answer': SignalingAnswer;
  'signaling:ice-candidate': ICECandidate;
  'call:ended': { sessionId: string; reason: 'skip' | 'disconnect' | 'flag' };
  'moderation:alert': ModerationFlag;
}

export interface SignalingOffer {
  from: string;
  to: string;
  offer: RTCSessionDescriptionInit;
  sessionId: string;
}

export interface SignalingAnswer {
  from: string;
  to: string;
  answer: RTCSessionDescriptionInit;
  sessionId: string;
}

export interface ICECandidate {
  from: string;
  to: string;
  candidate: RTCIceCandidateInit;
}

// Matching Queue
export interface MatchRequest {
  userId: string;
  preferences: MatchmakingPreferences;
  mood?: string;
  interests?: string[];
  joinedAt: number;
}

export interface MatchResult {
  user1: MatchRequest;
  user2: MatchRequest;
  compatibility: number;
  score: number;
}
