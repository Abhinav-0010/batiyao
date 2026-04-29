import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore, useUserStore } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export function useSignaling() {
  const socketRef = useRef<Socket | null>(null);
  const { userId } = useUserStore();
  const { setCurrentSessionId, setRemotePeerId, setCallState } = useChatStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(WS_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to signaling server');

      if (userId) {
        socketRef.current?.emit('user:join', {
          userId,
          preferences: {
            mode: 'random',
            genderFilter: 'any',
          },
        });
      }
    });

    socketRef.current.on('match:found', (data: any) => {
      console.log('🎯 Match found:', data);
      setCurrentSessionId(data.sessionId);
      setRemotePeerId(data.matchId);
      setCallState('ringing');
    });

    socketRef.current.on('signaling:offer', (data: any) => {
      console.log('📨 Offer received');
      // Handle offer in WebRTC hook
    });

    socketRef.current.on('signaling:answer', (data: any) => {
      console.log('📩 Answer received');
      // Handle answer in WebRTC hook
    });

    socketRef.current.on('signaling:ice-candidate', (data: any) => {
      console.log('❄️  ICE candidate received');
      // Handle ICE candidate in WebRTC hook
    });

    socketRef.current.on('call:ended', (data: any) => {
      console.log('📞 Call ended:', data);
      setCallState('ended');
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Disconnected from signaling server');
    });
  }, [userId, setCurrentSessionId, setRemotePeerId, setCallState]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    emit,
    on,
    socket: socketRef.current,
  };
}
