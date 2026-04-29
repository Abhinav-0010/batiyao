import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore, useChatStore } from '../store';
import { Video, Zap, Shield, Users } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { setUserId, setPseudonym } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize anonymous user
    const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    const pseudonym = `Anonymous_${Math.floor(Math.random() * 10000)}`;

    setUserId(userId);
    setPseudonym(pseudonym);
  }, [setUserId, setPseudonym]);

  const handleStartChat = async () => {
    setIsLoading(true);
    try {
      // Navigate to chat page
      navigate('/chat');
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-slide-up">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          AAJA Live
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Connect with strangers. No login. No judgment. Just real conversations.
        </p>

        <button
          onClick={handleStartChat}
          disabled={isLoading}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connecting...' : '🚀 Start Chatting'}
        </button>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mb-12">
        {[
          {
            icon: <Zap className="w-8 h-8" />,
            title: 'Instant Matching',
            description: 'Find your next conversation in under 500ms',
          },
          {
            icon: <Shield className="w-8 h-8" />,
            title: 'AI Moderation',
            description: 'Real-time safety with NSFW detection',
          },
          {
            icon: <Users className="w-8 h-8" />,
            title: 'Complete Privacy',
            description: 'Ephemeral sessions, no personal data stored',
          },
          {
            icon: <Video className="w-8 h-8" />,
            title: 'HD Video',
            description: 'Crystal clear 720p video at low latency',
          },
        ].map((feature, idx) => (
          <div
            key={idx}
            className="glassmorphism p-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
          >
            <div className="text-purple-400 mb-4">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-8 max-w-2xl text-center">
        {[
          { label: 'Active Users', value: '50K+' },
          { label: 'Avg Wait Time', value: '<3s' },
          { label: 'Uptime', value: '99.9%' },
        ].map((stat, idx) => (
          <div key={idx}>
            <p className="text-3xl font-bold text-purple-400">{stat.value}</p>
            <p className="text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
