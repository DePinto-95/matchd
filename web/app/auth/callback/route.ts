/**
 * Supabase auth callback: exchanges the PKCE code for a session.
 *
 * Used by email confirmation and password reset links.
 *
 * This builds its own server client rather than using lib/supabase/server.ts
 * because the session cookies must be set on the redirect response created
 * here — the next/headers cookie store that server.ts uses cannot write to it,
 * and the session would be lost on the redirect.
 *
 * One of only two places allowed to call supabase.auth directly instead of
 * going through shared/services/ (the other is proxy.ts).
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
