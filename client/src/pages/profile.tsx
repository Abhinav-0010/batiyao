import { useUserStore } from '../store';

export function ProfilePage() {
  const { userId, pseudonym, tier, reputation } = useUserStore();

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Your Profile</h1>

        <div className="glassmorphism rounded-lg p-8 space-y-6">
          {/* Pseudonym */}
          <div>
            <label className="text-gray-400 text-sm">Pseudonym</label>
            <p className="text-2xl font-bold text-white mt-2">{pseudonym}</p>
          </div>

          {/* Tier */}
          <div>
            <label className="text-gray-400 text-sm">Account Tier</label>
            <p className="text-xl font-bold text-purple-400 mt-2 capitalize">
              {tier}
            </p>
          </div>

          {/* Reputation */}
          <div>
            <label className="text-gray-400 text-sm">Reputation Score</label>
            <p className="text-xl font-bold text-green-400 mt-2">{reputation}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">42</p>
              <p className="text-gray-400 text-sm">Chats</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">4.8</p>
              <p className="text-gray-400 text-sm">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">12.5h</p>
              <p className="text-gray-400 text-sm">Time</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <button className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all">
              Upgrade to Premium
            </button>
            <button className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all">
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
