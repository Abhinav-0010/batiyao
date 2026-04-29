import { create } from 'zustand';
import type { ChatUIState, RemotePeer, LocalMedia } from '../types';

interface ChatStore extends ChatUIState {
  // State setters
  setConnectionState: (state: ChatUIState['connectionState']) => void;
  setCallState: (state: ChatUIState['callState']) => void;
  setCurrentSessionId: (id?: string) => void;
  setRemotePeerId: (id?: string) => void;
  setIsSkipping: (skipping: boolean) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  setModerationAlert: (alert: ChatUIState['moderationAlert']) => void;
  clearModerationAlert: () => void;
  reset: () => void;
}

const initialState: ChatUIState = {
  connectionState: 'idle',
  callState: 'idle',
  isSkipping: false,
  isMuted: false,
  isVideoOff: false,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  setConnectionState: (state) => set({ connectionState: state }),
  setCallState: (state) => set({ callState: state }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setRemotePeerId: (id) => set({ remotePeerId: id }),
  setIsSkipping: (skipping) => set({ isSkipping: skipping }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleVideo: () => set((state) => ({ isVideoOff: !state.isVideoOff })),

  setModerationAlert: (alert) => set({ moderationAlert: alert }),
  clearModerationAlert: () => set({ moderationAlert: undefined }),

  reset: () => set(initialState),
}));

interface UserStore {
  userId?: string;
  pseudonym: string;
  tier: 'free' | 'premium' | 'vip';
  reputation: number;

  setUserId: (id: string) => void;
  setPseudonym: (pseudonym: string) => void;
  setTier: (tier: 'free' | 'premium' | 'vip') => void;
  setReputation: (reputation: number) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  pseudonym: 'Anonymous',
  tier: 'free',
  reputation: 0,

  setUserId: (id) => set({ userId: id }),
  setPseudonym: (pseudonym) => set({ pseudonym }),
  setTier: (tier) => set({ tier }),
  setReputation: (reputation) => set({ reputation }),
}));

interface PreferencesStore {
  mode: 'random' | 'mood' | 'interest';
  genderFilter?: string;
  regionFilter?: string[];
  autoSkipNSFW: boolean;
  anonymousMode: boolean;

  setMode: (mode: 'random' | 'mood' | 'interest') => void;
  setGenderFilter: (filter?: string) => void;
  setRegionFilter: (filter?: string[]) => void;
  toggleAutoSkipNSFW: () => void;
  toggleAnonymousMode: () => void;
}

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  mode: 'random',
  autoSkipNSFW: true,
  anonymousMode: true,

  setMode: (mode) => set({ mode }),
  setGenderFilter: (filter) => set({ genderFilter: filter }),
  setRegionFilter: (filter) => set({ regionFilter: filter }),
  toggleAutoSkipNSFW: () => set((state) => ({ autoSkipNSFW: !state.autoSkipNSFW })),
  toggleAnonymousMode: () => set((state) => ({ anonymousMode: !state.anonymousMode })),
}));
