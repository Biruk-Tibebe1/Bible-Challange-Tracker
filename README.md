# Bible Challenge

A mobile-first Bible reading challenge for the complete Ethiopian calendar year 2019 E.C.: Meskerem 1 (Day 1) through Pagume 5 (Day 365), inclusive. The predefined schedule is generated from the canonical Bible dataset: Day 1 is Genesis 1–3, Day 365 is Revelation 19–22, and every chapter is assigned once.

The standard Protestant Bible catalog contains 66 books and 1,189 chapters. Custom schedules use the same ordered dataset and challenge generator. Email/password authentication is available through Supabase; authenticated challenge definitions and individual completion state are stored in Supabase after applying the migrations below. Unauthenticated challenge browsing and completion remain session-only.

This application uses the Next.js App Router, TypeScript, and Tailwind CSS. Challenge period and reading-distribution requirements are centralized in `src/features/challenge-days/challenge-config.ts`.

## Supabase setup

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project. These are the project URL and publishable client key; do not place a service-role key in this application. Restart the dev server after changing environment variables.

Apply both schema migrations in `supabase/migrations/` using the Supabase CLI (`supabase link` followed by `supabase db push`) or run them in timestamp order in the Supabase SQL editor. They create profiles, challenge definitions, challenge-day schedules, individual progress with RLS, auth-derived ownership defaults, and an atomic RPC for saving challenge definitions with generated days. No Supabase credentials are included in this repository.

When Supabase environment variables are absent, authentication pages explain that account access is not configured; challenge browsing and session-only progress remain available. Authenticated progress is stored in `user_challenge_progress`; custom schedules are generated in TypeScript and saved atomically with their challenge definition. The predefined plan is provisioned once per user through a stable challenge key.

## External Bible sources

KJV is local. Amharic and NIV remain unavailable until their external sources are configured and rights are confirmed. For Amharic, set `AMHARIC_BIBLE_API_URL`, the exact provider-supplied `AMHARIC_BIBLE_ATTRIBUTION`, and `AMHARIC_BIBLE_LICENSE_CONFIRMED=true` only after verifying the source is licensed for the complete 66-book canon; `AMHARIC_BIBLE_API_KEY` is optional and server-only. The API must provide a complete book/chapter catalog before any Amharic text is returned.

NIV uses API.Bible. Set `NIV_BIBLE_API_KEY`, the exact `NIV_BIBLE_ID` returned for a Bible available to your API.Bible account, and `NIV_BIBLE_LICENSE_CONFIRMED=true` only after verifying your account plan/license permits this application's use. The server checks the Bible ID, NIV metadata, copyright, and full 66-book chapter catalog; its copyright notice is rendered with the text and FUMS v3 view tracking is reported. API access alone does not imply unrestricted rights. No Scripture dataset or real source credentials are included in this repository.

The app is installable over HTTPS (and localhost during development). The service worker caches only allowlisted public pages, static app assets, and KJV chapter responses. Authenticated Supabase data and external translation responses are never cached. Reminder settings are stored on the device; notifications are checked only while the app is open. Background push reminders are not configured.

## Vercel deployment

1. Create or link the Supabase project and apply both migrations before deploying.
2. In Vercel Project Settings → Environment Variables, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production (and Preview/Development if needed). Use the Supabase project URL and publishable client key; never add a service-role key.
3. Import the repository into Vercel, keep the Next.js framework preset and default `npm run build` command, and deploy with the Vercel dashboard or `npx vercel --prod` after `vercel link`.
4. Configure the Supabase Auth site URL and allowed redirect URLs to the deployed Vercel domain, including any preview domains you intend to use.
5. Redeploy after setting environment variables. Do not commit `.env.local`; it is ignored by Git.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Use `npm run build` to create a production build and `npm start` to serve it.