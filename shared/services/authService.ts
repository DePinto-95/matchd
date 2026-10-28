import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { AccountType } from '../enums';

export const createAuthService = (supabase: SupabaseClient) => ({
  getSession: () => supabase.auth.getSession(),

  getUser: () => supabase.auth.getUser(),

  onAuthStateChange: (
    callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>
  ) => supabase.auth.onAuthStateChange(callback),

  signUp: (email: string, password: string, username: string, accountType: AccountType) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { username, account_type: accountType } },
    }),

  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  resetPasswordForEmail: (email: string, redirectTo: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo }),

  updatePassword: (password: string) => supabase.auth.updateUser({ password }),

  exchangeCodeForSession: (code: string) => supabase.auth.exchangeCodeForSession(code),
});

export type AuthService = ReturnType<typeof createAuthService>;
