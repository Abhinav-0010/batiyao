import { useState, useEffect } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSignaling } from '../hooks/useSignaling';
import { useMediaStream } from '../hooks/useMediaStream';
import { useChatStore, useUserStore } from '../store';
import { PhoneOff, Mic, MicOff, Video, VideoOff, SkipForward } from 'lucide-react';

export function ChatPage() {
  const { videoRef } = useMediaStream();
  const { connect, emit } = useSignaling();
  const {
    createOffer,
    getLocalStream,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useWebRTC();

  const {
    callState,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo: toggleVideoState,
  } = useChatStore();

  const [isLoading, setIsLoading] = useState(true);
  const { pseudonym } = useUserStore();

  useEffect(() => {
    const startChat = async () => {
      try {
        // Connect to signaling server
        connect();

        // Get local stream
        const stream = await getLocalStream();
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error starting chat:', error);
      }
    };

    startChat();
  }, [connect, getLocalStream, videoRef]);

  const handleSkip = () => {
    endCall();
    emit('user:skip', { userId: useUserStore.getState().userId });
  };

  const handleToggleMute = () => {
    toggleMute();
    toggleAudio(!isMuted);
  };

  const handleToggleVideo = () => {
    toggleVideoState();
    toggleVideo(!isVideoOff);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Finding your match...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-4">
        {/* Local Video */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-purple-600/80 px-3 py-1 rounded-full text-sm">
            {pseudonym}
          </div>
          {isVideoOff && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Remote Video */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-pink-600/80 px-3 py-1 rounded-full text-sm">
            Stranger
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="text-center py-2 bg-slate-800/50">
        <span className="text-sm text-gray-300">
          {callState === 'waiting' && '⏳ Waiting for connection...'}
          {callState === 'ringing' && '📞 Ringing...'}
          {callState === 'active' && (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Connected
            </span>
          )}
        </span>
      </div>

      {/* Controls */}
      <div className="bg-slate-900/80 backdrop-blur border-t border-slate-700 px-4 py-6 flex items-center justify-center gap-4">
        <button
          onClick={handleToggleMute}
          className={`p-3 rounded-full transition-all ${
            isMuted
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={handleToggleVideo}
          className={`p-3 rounded-full transition-all ${
            isVideoOff
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isVideoOff ? (
            <VideoOff className="w-6 h-6" />
          ) : (
            <Video className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={handleSkip}
          className="p-3 rounded-full bg-amber-600 hover:bg-amber-700 transition-all"
        >
          <SkipForward className="w-6 h-6" />
        </button>

        <button
          onClick={() => endCall()}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
