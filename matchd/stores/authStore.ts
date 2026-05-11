import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<() => void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  initialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId: string) => {
    set({ profileLoading: true });
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      set({ profile: data, profileLoading: false });
      return;
    }

    // No profile yet — auto-create as player
    const { data: authUser } = await supabase.auth.getUser();
    const username =
      authUser.user?.user_metadata?.username ?? `user_${userId.slice(0, 6)}`;
    const { data: newProfile } = await supabase
      .from('profiles')
      .upsert({ id: userId, account_type: 'player', username })
      .select()
      .single();
    set({ profile: newProfile ?? null, profileLoading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null });
    if (session?.user) {
      await get().fetchProfile(session.user.id);
    }
    set({ loading: false, initialized: true });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          await get().fetchProfile(session.user.id);
        } else {
          set({ profile: null });
        }
      }
    );

    return () => subscription.unsubscribe();
  },
}));
