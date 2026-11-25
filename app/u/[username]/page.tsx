'use client';

import { useCallback, useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Flame, Target, UserPlus, UserCheck, Flag } from 'lucide-react';
import ReportBlockModal from '@/components/ReportBlockModal';
import ProfileAvatar from '@/components/ProfileAvatar';

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
  const [reporting, setReporting] = useState(false);
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
        .from('follows')
        .select('following_id')
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
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id);
    } else {
      setIsSupporting(true);
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: profile.id });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center p-4">
        <p className="text-xs text-slate-500 animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-6 text-center space-y-4">
        <p className="text-sm font-bold text-slate-400">User @{username} not found.</p>
        <Link
          href="/search"
          className="inline-block py-2 px-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-500"
        >
          Back to Search
        </Link>
      </div>
    );
  }

  const isSelf = currentUserId === profile.id;
  const totalStreaks = goals.reduce((acc, g) => acc + (g.streak_count || 0), 0);

  const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
  const name = profile.full_name || profile.username
  const categoryName = (c: string | null) => (c ? c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' ') : 'Personal')

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4 text-slate-900 dark:text-slate-100">
      <div className="flex h-10 items-center justify-between">
        <Link href="/search" aria-label="Back" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></Link>
        {!isSelf && <button type="button" onClick={() => setReporting(true)} className="-mr-2 flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Flag className="h-4 w-4" />Report or block</button>}
      </div>
      {reporting && <ReportBlockModal targetUserId={profile.id} name={name.split(' ')[0]} what="profile" context={[profile.full_name, profile.bio].filter(Boolean).join(' / ')} isOpen onClose={() => setReporting(false)} />}

      <section className={`${card} mt-2 p-5`}>
        <div className="flex items-center gap-4">
          <ProfileAvatar value={profile.avatar_url} name={name} size={64} className="rounded-full" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{name}</h1>
            <p className="truncate text-sm text-slate-500">@{profile.username}</p>
          </div>
        </div>
        {profile.bio && <p className="mt-3 text-[15px] text-slate-700 dark:text-slate-200">{profile.bio}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div><dt className="sr-only">Goals</dt><dd className="text-2xl font-bold tabular-nums">{goals.length}</dd><dd className="text-sm text-slate-500">{goals.length === 1 ? 'goal' : 'goals'} in progress</dd></div>
          <div><dt className="sr-only">Days in a row</dt><dd className="text-2xl font-bold tabular-nums">{totalStreaks}</dd><dd className="text-sm text-slate-500">days in a row, across goals</dd></div>
        </dl>
        {!isSelf && <button type="button" onClick={toggleSupport}
          className={`mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold ${isSupporting ? 'border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>
          {isSupporting ? <><UserCheck className="h-4 w-4" />Supporting</> : <><UserPlus className="h-4 w-4" />Support {name.split(' ')[0]}</>}
        </button>}
      </section>

      <h2 className="mb-3 mt-6 text-base font-semibold">Goals</h2>
      {goals.length === 0
        ? <p className={`${card} p-5 text-center text-sm text-slate-500`}>No public goals yet.</p>
        : <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
            {goals.map((goal) => <li key={goal.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{goal.title}</span><span className="block text-sm text-slate-500">{categoryName(goal.category)}</span></span>
              {(goal.streak_count || 0) > 0 && <span className="shrink-0 text-sm text-slate-500">{goal.streak_count} {goal.streak_count === 1 ? 'day' : 'days'} in a row</span>}
            </li>)}
          </ul>}
    </main>
  );
}
