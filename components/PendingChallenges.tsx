'use client';

import { useState } from 'react';
import { Swords, Check, X, Clock } from 'lucide-react';

export interface ChallengeInvite {
  id: string;
  goalTitle: string;
  senderName: string;
  senderAvatar?: string;
  targetDate: string;
  challengeNote?: string;
}

interface PendingChallengesProps {
  challenges: ChallengeInvite[];
  onResponse: (challengeId: string, status: 'accepted' | 'declined') => Promise<void>;
}

export default function PendingChallenges({ challenges, onResponse }: PendingChallengesProps) {
  const [loadingChallengeId, setLoadingChallengeId] = useState<string | null>(null);

  const handleAction = async (id: string, status: 'accepted' | 'declined') => {
    setLoadingChallengeId(id);
    try {
      await onResponse(id, status);
    } finally {
      setLoadingChallengeId(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        <Swords className="w-4 h-4 text-purple-400" /> Pending Challenges ({challenges.length})
      </h3>

      {challenges.length === 0 ? (
        <div className="p-4 bg-[#161b22] border border-gray-800 rounded-xl text-center text-xs text-gray-500">
          No pending challenge invitations.
        </div>
      ) : (
        challenges.map((invite) => {
          const isProcessing = loadingChallengeId === invite.id;
          return (
            <div key={invite.id} className="p-4 bg-[#161b22] border border-gray-800 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                {invite.senderAvatar && (
                  <img
                    src={invite.senderAvatar}
                    alt={invite.senderName}
                    className="w-9 h-9 rounded-full object-cover border border-purple-500/30 bg-gray-900 p-0.5"
                  />
                )}
                <div className="flex-1">
                  <p className="text-xs text-gray-400">
                    <strong className="text-white">{invite.senderName}</strong> challenged you:
                  </p>
                  <p className="text-sm font-bold text-purple-400">{invite.goalTitle}</p>
                  {invite.challengeNote && (
                    <p className="text-xs italic text-gray-400 mt-0.5">"{invite.challengeNote}"</p>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Target: {invite.targetDate}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  disabled={isProcessing}
                  onClick={() => handleAction(invite.id, 'declined')}
                  className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 rounded-lg flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5 text-red-400" /> Decline
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => handleAction(invite.id, 'accepted')}
                  className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white rounded-lg flex items-center justify-center gap-1 shadow-sm transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}