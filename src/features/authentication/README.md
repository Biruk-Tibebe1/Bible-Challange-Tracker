# Authentication

Supabase Auth is provided through `auth-provider.tsx`, which exposes the authenticated user, initialization state, configuration state, and sign-out action through `useAuth()`.

`/auth/sign-in` and `/auth/sign-up` provide email/password authentication. The challenge remains available without an account, and the challenge page links to account access. Authenticated users can save progress after the persistence migration is applied; unauthenticated progress remains session-only.

The browser and server clients are separated under `src/lib/supabase`. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`; never put a service-role key in frontend configuration. See the root README for migration setup.