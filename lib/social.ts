import { supabase } from './supabaseClient';

export async function getCircleCounts(userId: string) {
  // Number of people in this user's circle (followers)
  const { count: inCircleCount } = await supabase
    .from('circle_members')
    .select('*', { count: 'exact', head: true })
    .eq('guarded_id', userId);

  // Number of circles this user supports (following)
  const { count: supportingCount } = await supabase
    .from('circle_members')
    .select('*', { count: 'exact', head: true })
    .eq('supporter_id', userId);

  return {
    inCircle: inCircleCount || 0,
    supporting: supportingCount || 0,
  };
}

export async function isUserInCircle(guardedId: string, currentUserId: string) {
  const { data } = await supabase
    .from('circle_members')
    .select('id')
    .eq('guarded_id', guardedId)
    .eq('supporter_id', currentUserId)
    .single();

  return !!data;
}

export async function joinCircle(guardedId: string, currentUserId: string) {
  return await supabase.from('circle_members').insert({
    guarded_id: guardedId,
    supporter_id: currentUserId,
  });
}

export async function leaveCircle(guardedId: string, currentUserId: string) {
  return await supabase
    .from('circle_members')
    .delete()
    .eq('guarded_id', guardedId)
    .eq('supporter_id', currentUserId);
}