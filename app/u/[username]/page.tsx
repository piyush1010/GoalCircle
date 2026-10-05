'use client';

import { useCallback, useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Flame, Target, UserPlus, UserCheck } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Goal {
  id: string;
  title: string;
  category: string;
  streak_count: number;
  is_completed: boolean;
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupporting, setIsSupporting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    // 1. Get current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // 2. Fetch target profile by username
    const { data: targetProfile, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .eq('username', username)
      .single();

    if (error || !targetProfile) {
      setLoading(false);
      return;
    }

    setProfile(targetProfile);

    // 3. Check if current user is supporting this profile
    if (user) {
      const { data: rel } = await supabase
        .from('user_relationships')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetProfile.id)
        .maybeSingle();

      setIsSupporting(!!rel);
    }

    // 4. Fetch target user's goals
    const { data: userGoals } = await supabase
      .from('goals')
      .select('id, title, category, streak_count, is_completed')
      .eq('user_id', targetProfile.id)
      .order('created_at', { ascending: false });

    if (userGoals) setGoals(userGoals);
    setLoading(false);
  }, [username]);

  useEffect(() => {
    void Promise.resolve().then(fetchProfileData);
  }, [fetchProfileData]);

  const toggleSupport = async () => {
    if (!currentUserId || !profile) return;

    if (isSupporting) {
      setIsSupporting(false);
      await supabase
        .from('user_relationships')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id);
    } else {
      setIsSupporting(true);
      await supabase
        .from('user_relationships')
        .insert({ follower_id: currentUserId, following_id: profile.id });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <p className="text-xs text-slate-500 animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 text-center space-y-4">
        <p className="text-sm font-bold text-slate-400">User @{username} not found.</p>
        <Link
          href="/search"
          className="inline-block py-2 px-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-amber-500"
        >
          Back to Search
        </Link>
      </div>
    );
  }

  const isSelf = currentUserId === profile.id;
  const totalStreaks = goals.reduce((acc, g) => acc + (g.streak_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 max-w-2xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/search"
          className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Circle Profile
        </span>
        <div className="w-9" />
      </div>

      {/* Profile Header Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 text-center relative overflow-hidden">
        <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 border-2 border-amber-500 flex items-center justify-center overflow-hidden font-black text-amber-500 text-2xl shadow-lg">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            profile.username?.[0]?.toUpperCase()
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-100">
            {profile.full_name || profile.username}
          </h1>
          <p className="text-xs font-bold text-amber-500">@{profile.username}</p>
          {profile.bio && (
            <p className="text-xs text-slate-400 max-w-md mx-auto pt-1 font-medium">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5 text-amber-500 font-black text-lg">
              <Flame size={18} />
              <span>{totalStreaks}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Streaks</p>
          </div>
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-lg">
              <Target size={18} />
              <span>{goals.length}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Goals</p>
          </div>
        </div>

        {/* Support Button */}
        {!isSelf && (
          <button
            type="button"
            onClick={toggleSupport}
            className={`w-full py-3.5 rounded-2xl font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-md ${
              isSupporting
                ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                : 'bg-amber-500 text-black hover:bg-amber-600'
            }`}
          >
            {isSupporting ? (
              <>
                <UserCheck size={16} /> Supporting in Circle
              </>
            ) : (
              <>
                <UserPlus size={16} /> Support this Circle
              </>
            )}
          </button>
        )}
      </div>

      {/* Active Goals Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
          Active Goals & Habits
        </h2>

        {goals.length === 0 ? (
          <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl text-center text-xs text-slate-500 font-medium">
            No active goals publicly listed yet.
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                  {goal.category || 'General'}
                </span>
                <p className="text-xs font-bold text-slate-100">{goal.title}</p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-extrabold">
                <Flame size={14} />
                <span>{goal.streak_count || 0}d streak</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
