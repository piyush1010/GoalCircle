'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { validatePauseEligibility } from '../utils/goalRules';
import { PauseCircle, AlertTriangle, X } from 'lucide-react';

interface GoalPauseModalProps {
  goalId: string;
  currentPauseCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GoalPauseModal({
  goalId,
  currentPauseCount,
  isOpen,
  onClose,
  onSuccess,
}: GoalPauseModalProps) {
  const [pauseType, setPauseType] = useState<'standard' | 'tragedy'>('standard');
  const [tragedyExplanation, setTragedyExplanation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleApplyPause() {
    setErrorMessage('');

    const validation = validatePauseEligibility({
      currentPauseCount,
      reasonType: pauseType,
      tragedyExplanation,
    });

    if (!validation.allowed) {
      setErrorMessage(validation.message);
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('goals')
      .update({
        status: 'paused',
        pause_count: currentPauseCount + 1,
        paused_at: new Date().toISOString(),
        pause_reason: pauseType === 'tragedy' ? tragedyExplanation : 'standard',
      })
      .eq('id', goalId);

    setLoading(false);

    if (error) {
      setErrorMessage('Failed to pause goal. Please try again.');
    } else {
      onSuccess();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
            <PauseCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Pause Goal</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Used: {currentPauseCount}/2 lifetime pauses
            </p>
          </div>
        </div>

        {currentPauseCount >= 2 ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs mb-4">
            You have reached the maximum limit of 2 lifetime pauses for this goal.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setPauseType('standard')}
                className={`p-3 rounded-2xl text-xs font-semibold border transition ${
                  pauseType === 'standard'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Standard Pause
                <span className="block font-normal text-[10px] opacity-80 mt-0.5">Max 5 consecutive days</span>
              </button>

              <button
                type="button"
                onClick={() => setPauseType('tragedy')}
                className={`p-3 rounded-2xl text-xs font-semibold border transition ${
                  pauseType === 'tragedy'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Tragedy Pause
                <span className="block font-normal text-[10px] opacity-80 mt-0.5">Up to 14 days extended</span>
              </button>
            </div>

            {pauseType === 'tragedy' && (
              <div className="mb-4">
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                  Reason for Tragedy Extension
                </label>
                <textarea
                  rows={3}
                  value={tragedyExplanation}
                  onChange={(e) => setTragedyExplanation(e.target.value)}
                  placeholder="Please state the unforeseen circumstances..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {errorMessage && (
              <div className="p-3 mb-4 bg-red-500/10 text-red-500 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleApplyPause}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 font-semibold text-black rounded-xl text-sm transition"
            >
              {loading ? 'Applying...' : 'Confirm Pause'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}