'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Flag, ShieldAlert, Ban } from 'lucide-react';

export default function ReportBlockModal({ targetUserId, isOpen, onClose }: { targetUserId: string; isOpen: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleReport() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!reason.trim()) { setError('Choose a brief reason before submitting.'); return; }
    const { error: reportError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_user_id: targetUserId,
      reason: reason.trim(),
    });
    if (reportError) { setError('The report could not be submitted.'); return; }
    setSubmitted(true);
  }

  async function handleBlock() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: blockError } = await supabase.from('blocks').insert({
      blocker_id: user.id,
      blocked_id: targetUserId,
    });
    if (blockError) { setError('This member could not be blocked.'); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
          <ShieldAlert className="text-red-500" size={20} /> Safety & Moderation
        </h3>

        {!submitted ? (
          <>
            <textarea
              placeholder="Reason for reporting profile (e.g. fake profile, spam, offensive posts)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm mb-4 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
            <div className="flex flex-col gap-2">
              {error && <p role="alert" className="rounded-xl bg-red-500/10 p-2 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}
              <button
                onClick={handleReport}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Flag size={16} /> Report Profile
              </button>
              <button
                onClick={handleBlock}
                className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Ban size={16} /> Block User
              </button>
              <button onClick={onClose} className="mt-2 text-xs text-slate-500 text-center">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              Report recorded. Thank you for helping keep GoalYaar focused and respectful.
            </p>
            <button onClick={onClose} className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-xl text-sm">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
