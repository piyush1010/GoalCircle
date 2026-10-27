// One shared Supabase client for the whole app. Two clients meant two sign-in refreshes on
// every app open, racing each other; this file now just points at the shared one.
export { supabase } from '@/utils/supabase'
