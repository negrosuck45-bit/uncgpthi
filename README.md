# UNC-GPT COMPLETE v2

## What's Fixed
- AI talks normally for "hi", questions, jokes (NO tools for casual chat)
- Only uses tools for explicit actions ("run code", "create repo", etc.)
- Terminal regex bug fixed
- All your real API keys embedded

## Your Keys (Already in Code)
- 3x Groq API keys
- 7x Cloudflare Worker URLs
- 1x Image/Video Worker URL
- All model configs

## Only in .env.local
```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

## Setup
1. Add Supabase credentials to `.env.local`
2. Run `supabase-schema.sql` in Supabase SQL Editor
3. `npm install && npm run dev`
4. Open http://localhost:3000

## Deploy
```bash
git add .
git commit -m "UNC-GPT v2"
git push origin main
```
Then add env vars in Vercel dashboard.
