'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ProtectedAvatar from '@/components/ProtectedAvatar';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Target, ShieldCheck, AlertCircle, LogIn, Plus } from 'lucide-react';

const PRESET_CATEGORIES = [
  'General',
  'Health & Fitness',
  'Career & Learning',
  'Mindfulness',
  'Personal Growth',
  'Finance & Savings',
  'Productivity & Tech',
  'Creativity & Art',
  'Relationships & Social',
  'Custom (+ Add Custom)',
];

export default function CreateGoalPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [targetMetric, setTargetMetric] = useState('days');
  const [targetValue, setTargetValue] = useState(30);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        setUser(currentUser);
      } catch (err) {
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      setErrorMsg('You must be logged in to create a goal.');
      router.push('/login');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Goal title is required.');
      return;
    }

    // Determine final category string
    const finalCategory =
      selectedCategory === 'Custom (+ Add Custom)'
        ? customCategory.trim() || 'General'
        : selectedCategory;

    setLoading(true);

    try {
      const { error } = await supabase.from('goals').insert([
        {
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category: finalCategory,
          target_metric: targetMetric || 'days',
          target_value: Number(targetValue) || 1,
          current_value: 0,
          is_paused: false,
          pause_count: 0,
        },
      ]);

      if (error) {
        setErrorMsg(`Error creating goal: ${error.message}`);
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      setErrorMsg(`An unexpected error occurred: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Declare a Goal</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set micro-habits & rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!user && (
            <Link
              href="/login"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <LogIn size={14} />
              <span>Login / Sign Up</span>
            </Link>
          )}
          <ProtectedAvatar />
        </div>
      </header>

      {/* Unauthenticated Banner Notice */}
      {!user && (
        <div className="p-4 mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-2xl text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-amber-500" />
            <span>You are currently not signed in. Please log in or create an account to save goals.</span>
          </div>
          <Link
            href="/login"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl whitespace-nowrap"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Goal Creation Form */}
      <form onSubmit={handleCreateGoal} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
            Goal Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Read 20 pages or Learn Python"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
            Why It Matters / Description
          </label>
          <textarea
            rows={3}
            placeholder="What is your motivation or daily habit commitment?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition"
            >
              {PRESET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              Target Duration (Days)
            </label>
            <input
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Custom Category Input (only shows if 'Custom' is selected) */}
        {selectedCategory === 'Custom (+ Add Custom)' && (
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
              Enter Custom Category Name *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Language Learning or Coding"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-amber-500/50 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition"
                required
              />
              <Plus size={16} className="absolute right-4 top-3.5 text-amber-500" />
            </div>
          </div>
        )}

        {/* Rules Banner Notice */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs text-amber-700 dark:text-amber-400">
          <ShieldCheck size={20} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <span className="font-bold block mb-0.5">
              Strict Pause Policy Enforced
            </span>
            <span>
              You will get max 2 lifetime pauses per goal. Pausing requires valid reasons and comes with a 3-day grace period.
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <Target size={18} />
          <span>{loading ? 'Creating Goal...' : 'Declare Goal'}</span>
        </button>
      </form>

      <BottomNav />
    </div>
  );
}