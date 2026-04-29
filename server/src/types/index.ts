// Shared types
export type UserStatus = 'idle' | 'matching' | 'connected' | 'banned';
export type ChatMode = 'random' | 'mood' | 'interest' | 'audio-only';
export type PremiumTier = 'free' | 'premium' | 'vip';

export interface User {
  id: string;
  pseudonym: string;
  status: UserStatus;
  tier: PremiumTier;
  reputation: number;
  createdAt: Date;
  lastActivityAt: Date;
  isBanned: boolean;
}

export interface ChatSession {
  id: string;
  initiatorId: string;
  recipientId: string;
  mode: ChatMode;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  flagged: boolean;
  violationCount: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'skip' | 'end-call';
  from: string;
  to: string;
  payload?: any;
  timestamp: number;
}

export interface MatchmakingPreferences {
  mode: ChatMode;
  genderFilter?: 'any' | 'male' | 'female' | 'non-binary';
  regionFilter?: string[];
  interests?: string[];
  privacyTier?: 'public' | 'semi-private' | 'private';
}

export interface ModerationFlag {
  sessionId: string;
  timestamp: number;
  nsfw: boolean;
  nsfwConfidence: number;
  abusive: boolean;
  reason?: string;
  action: 'blur' | 'disconnect' | 'report';
}

export interface PaymentEvent {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  feature: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId: string;
  timestamp: Date;
}
