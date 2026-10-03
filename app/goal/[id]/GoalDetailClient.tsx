'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Flame, ArrowLeft, Trophy, Calendar } from 'lucide-react';
import BottomNav from '../../../components/BottomNav';

export default function GoalDetailClient({ goalId }: { goalId: string }) {
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoal = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('goals')
          .select('*')
          .eq('id', goalId)
          .single();

        if (data) setGoal(data);
      } catch (err) {
        console.error('Error fetching goal details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (goalId) fetchGoal();
  }, [goalId]);

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 flex flex-col justify-between max-w-md mx-auto">
      <div className="space-y-6">
        <a href="/profile" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </a>

        {loading ? (
          <div className="text-center text-xs text-gray-500 py-10">Loading goal details...</div>
        ) : !goal ? (
          <div className="text-center text-xs text-gray-500 py-10">Goal not found.</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full">
                {goal.category || 'General'}
              </span>
              <h1 className="text-xl font-bold text-white">{goal.title}</h1>

              <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-800">
                <span className="flex items-center gap-1 text-orange-400 font-semibold">
                  <Flame className="w-4 h-4" /> {goal.streak_count || 0} Day Streak
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-500" /> Target: {goal.target_date || 'Ongoing'}
                </span>
              </div>
            </div>

            <a
              href={`/goal/${goalId}/create-post`}
              className="block w-full py-3 bg-purple-600 hover:bg-purple-700 text-center font-bold text-sm rounded-xl transition-all"
            >
              + Add Progress Update Post
            </a>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}