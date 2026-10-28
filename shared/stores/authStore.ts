import { create } from 'zustand';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { Profile } from '../types';
import { createAuthService, createProfileService } from '../services';

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

export const createAuthStore = (supabase: SupabaseClient) => {
  const auth = createAuthService(supabase);
  const profiles = createProfileService(supabase);

  return create<AuthState>((set, get) => ({
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
      const existing = await profiles.getById(userId);

      if (existing) {
        set({ profile: existing, profileLoading: false });
        return;
      }

      // No profile yet — auto-create as player
      const { data: authUser } = await auth.getUser();
      const username =
        authUser.user?.user_metadata?.username ?? `user_${userId.slice(0, 6)}`;
      set({ profile: await profiles.createDefault(userId, username), profileLoading: false });
    },

    signOut: async () => {
      await auth.signOut();
      set({ session: null, user: null, profile: null });
    },

    initialize: async () => {
      const { data: { session } } = await auth.getSession();
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        await get().fetchProfile(session.user.id);
      }
      set({ loading: false, initialized: true });

      const { data: { subscription } } = auth.onAuthStateChange(
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
};
