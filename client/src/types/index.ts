export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
export type CallState = 'idle' | 'waiting' | 'ringing' | 'active' | 'ended' | 'rejected';

export interface RemotePeer {
  id: string;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface LocalMedia {
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioTracks: MediaStreamAudioTrack[];
  videoTracks: MediaStreamVideoTrack[];
}

export interface WebRTCConnection {
  peerConnection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  iceCandidates: RTCIceCandidateInit[];
}

export interface ChatUIState {
  connectionState: ConnectionState;
  callState: CallState;
  currentSessionId?: string;
  remotePeerId?: string;
  isSkipping: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  moderationAlert?: {
    type: 'nsfw' | 'abuse' | 'spam';
    severity: 'warning' | 'critical';
  };
}

export interface UserProfile {
  id: string;
  pseudonym: string;
  tier: 'free' | 'premium' | 'vip';
  reputation: number;
  chatsCompleted: number;
  averageRating: number;
  preferences: UserPreferences;
}

export interface UserPreferences {
  mode: 'random' | 'mood' | 'interest';
  genderFilter?: string;
  regionFilter?: string[];
  autoSkipNSFW: boolean;
  anonymousMode: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
}
