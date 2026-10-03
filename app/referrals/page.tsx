'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  const referralCode = "GOALCIRCLE-ELITE-2026";

  function copyCode() {
    navigator.clipboard.writeText(`https://goalcircle.app/signup?ref=${referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-xl mx-auto p-4 pb-24 text-slate-900 dark:text-slate-100">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Share2 size={32} />
        </div>
        <h1 className="text-2xl font-bold">Invite Friends & Elevate</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Accountability works best together. Invite your friends to join private circles and earn Exclusive Ambassador Badges.
        </p>
      </div>

      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
        <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 block">Your Exclusive Referral Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={`https://goalcircle.app/signup?ref=${referralCode}`}
            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300"
          />
          <button
            onClick={copyCode}
            className="px-4 bg-amber-500 text-black font-semibold rounded-xl flex items-center gap-1.5 text-xs shrink-0"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}