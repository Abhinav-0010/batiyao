import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '../store';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface WebRTCConfig {
  iceServers: RTCIceServer[];
  offerOptions?: RTCOfferOptions;
}

export function useWebRTC() {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const {
    setConnectionState,
    setCallState,
    currentSessionId,
    remotePeerId,
    isMuted,
    isVideoOff,
  } = useChatStore();

  // Initialize WebRTC configuration
  const getWebRTCConfig = useCallback((): WebRTCConfig => ({
    iceServers: STUN_SERVERS,
    offerOptions: {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    },
  }), []);

  // Initialize peer connection
  const initiatePeerConnection = useCallback(async () => {
    try {
      setConnectionState('connecting');

      const config = getWebRTCConfig();
      const peerConnection = new RTCPeerConnection({
        iceServers: config.iceServers,
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('signaling:ice-candidate', {
            from: useChatStore.getState().userId,
            to: remotePeerId,
            candidate: event.candidate,
          });
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📹 Remote stream received');
        if (remoteStreamRef.current !== event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
        }
      };

      // Create data channel
      const dataChannel = peerConnection.createDataChannel('chat', {
        ordered: true,
      });
      setupDataChannel(dataChannel);

      peerConnection.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };

      peerConnectionRef.current = peerConnection;
      setConnectionState('connected');
      setCallState('waiting');

      return peerConnection;
    } catch (error) {
      console.error('❌ Error initiating peer connection:', error);
      setConnectionState('error');
      throw error;
    }
  }, [getWebRTCConfig, remotePeerId, setConnectionState, setCallState]);

  // Setup data channel
  const setupDataChannel = (dataChannel: RTCDataChannel) => {
    dataChannel.onopen = () => {
      console.log('📡 Data channel opened');
    };

    dataChannel.onmessage = (event) => {
      console.log('💬 Message received:', event.data);
    };

    dataChannelRef.current = dataChannel;
  };

  // Get local media stream
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      localStreamRef.current = stream;

      // Add tracks to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
      }

      return stream;
    } catch (error) {
      console.error('❌ Error getting local stream:', error);
      throw error;
    }
  }, []);

  // Create offer
  const createOffer = useCallback(async () => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }

      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peerConnectionRef.current.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('signaling:offer', {
          from: useChatStore.getState().userId,
          to: remotePeerId,
          offer,
          sessionId: currentSessionId,
        });
      }
    } catch (error) {
      console.error('❌ Error creating offer:', error);
    }
  }, [currentSessionId, remotePeerId]);

  // Create answer
  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }

      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      if (socketRef.current) {
        socketRef.current.emit('signaling:answer', {
          from: useChatStore.getState().userId,
          to: remotePeerId,
          answer,
          sessionId: currentSessionId,
        });
      }
    } catch (error) {
      console.error('❌ Error creating answer:', error);
    }
  }, [currentSessionId, remotePeerId]);

  // Handle answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error('Peer connection not initialized');
      }

      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      setCallState('active');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  }, [setCallState]);

  // Handle ICE candidate
  const handleICECandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    },
    []
  );

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setIsConnected(false);
    setCallState('ended');
  }, [setCallState]);

  // Cleanup
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    peerConnectionRef,
    localStreamRef,
    remoteStreamRef,
    isConnected,
    initiatePeerConnection,
    getLocalStream,
    createOffer,
    createAnswer,
    handleAnswer,
    handleICECandidate,
    toggleAudio,
    toggleVideo,
    endCall,
  };
}
