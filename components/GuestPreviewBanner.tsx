'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GuestPreviewBanner({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  if (isAuthenticated) return null;

  if (expired) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Guest Preview Ended</h2>
          <p className="text-slate-400 text-sm mb-6">
            Sign up now to join private groups, track your daily progress, earn badges, and boost your friends!
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/signup" className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl">
              Create Account
            </Link>
            <Link href="/login" className="w-full py-3 bg-slate-800 text-white rounded-xl font-medium">
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1.5 rounded-full backdrop-blur-md z-40">
      Guest Mode: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining
    </div>
  );
}