/**
 * Supabase client for Server Components and Server Actions, reading and
 * writing auth cookies through next/headers.
 *
 * Currently unused — every page under app/ is a client component, and all data
 * access goes through shared/services/ with the browser client. Kept for the
 * first server-rendered page that needs an authenticated read.
 *
 * NOT usable in app/auth/callback/route.ts: that route has to set session
 * cookies on a redirect response it constructs itself, which the next/headers
 * cookie store cannot do. It builds its own client on purpose.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — middleware handles refresh
          }
        },
      },
    }
  );
}
