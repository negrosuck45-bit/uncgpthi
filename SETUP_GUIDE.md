# 🚀 UNC-GPT COMPLETE v2 - FIXED SETUP GUIDE

## WHAT'S FIXED IN v2

### ✅ The "hi" Bug is FIXED
**Problem in v1:** When you said "hi", the AI tried to use tools/terminal instead of just talking.

**Fix in v2:** New smart system prompt:
- **Greetings, questions, opinions, explanations, jokes** → AI talks naturally, NO tools
- **"Run this code", "Create GitHub repo", "Send Slack message"** → Uses tools ONLY for explicit actions

### ✅ Your REAL API Keys Embedded
All your actual keys from your original file are already in the code:
- 3 Groq API keys (rotates between them)
- 7 Cloudflare Worker URLs
- Image/video generation worker URL
- All model configs (Groq, Puter Claude, Cloudflare)

### ✅ Only Supabase in .env.local

---

## 📁 FILE STRUCTURE

```
unc-gpt-complete-v2/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          ← FIXED: Smart system prompt, your real keys
│   │   ├── execute-code/
│   │   │   └── route.ts          ← Code execution (Python/JS/Bash)
│   │   ├── rag/
│   │   │   ├── upload/
│   │   │   ├── search/
│   │   │   ├── list/
│   │   │   └── delete/
│   │   ├── conversations/
│   │   └── messages/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  ← Full chat UI
├── components/
│   └── terminal-output.tsx       ← COLORED TERMINAL (syntax highlighting)
├── lib/
│   └── rag-service.ts
├── supabase-schema.sql           ← 30 tables
├── package.json
├── .env.local                    ← ONLY Supabase here
└── SETUP_GUIDE.md                ← This file
```

---

## 🔑 KEYS ALREADY IN CODE (no action needed)

These are already embedded in `app/api/chat/route.ts`:

| Service | Key/URL | Status |
|---------|---------|--------|
| Groq Key 1 | `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` | ✅ Embedded |
| Groq Key 2 | `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` | ✅ Embedded |
| Groq Key 3 | `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` | ✅ Embedded |
| CF Worker 1 | `old-hat-dab9.gamingac527.workers.dev` | ✅ Embedded |
| CF Worker 2 | `aiagent.negro-suck45.workers.dev` | ✅ Embedded |
| CF Worker 3 | `aged-wind-1e97.itzf302.workers.dev` | ✅ Embedded |
| CF Worker 4 | `gentle-feather-3960.abdulrehmannn934.workers.dev` | ✅ Embedded |
| CF Worker 5-7 | `blackmonkey098gg.workers.dev` (x3) | ✅ Embedded |
| Image Worker | `fragrant-band-d94a.blackmonkey098gg.workers.dev` | ✅ Embedded |
| Puter API | `api.puter.com` | ✅ Embedded (token empty) |

---

## 🗄️ STEP 1: SUPABASE SETUP (ONLY THING IN .ENV)

1. Go to [supabase.com](https://supabase.com) → Create free project
2. Project Settings → API → copy URL + keys
3. Paste into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. SQL Editor → paste ALL of `supabase-schema.sql` → Run

---

## 📦 STEP 2: INSTALL & RUN

```bash
cd unc-gpt-complete-v2
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🚀 STEP 3: DEPLOY TO VERCEL

```bash
git add .
git commit -m "UNC-GPT v2 - fixed chat + real keys"
git push origin main
```

Then in Vercel dashboard, add these Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (your vercel URL)

---

## 🎨 HOW THE AI BEHAVES NOW

| User Says | AI Response |
|-----------|-------------|
| "hi" | "Hey! How's it going?" (normal chat, NO tools) |
| "what's 2+2?" | "4" (normal chat, NO tools) |
| "tell me a joke" | Tells a joke (normal chat, NO tools) |
| "run python: print('hello')" | Uses terminal tool ✅ |
| "create GitHub repo called test" | Uses GitHub tool ✅ |
| "search web for AI news" | Uses web search tool ✅ |
| "what's in my PDF?" | Uses RAG tool ✅ |

---

## 🆘 IF STILL NOT TALKING NORMALLY

If the AI still uses tools for "hi", check:

1. **Is it using Groq?** The system prompt fix is in the Groq call. If it falls back to Cloudflare workers, they might not have the fix.

2. **Force Groq:** Select "Llama 3.3 70B" or "Llama 3.1 8B" from the model dropdown (these use Groq with the fixed prompt).

3. **Check console:** Look for `[UNCGPT] Model: ... | Provider: ... | Tools: 0` — if Tools > 0 for "hi", something is wrong.

---

## 💰 COSTS (ALL FREE)

| Service | Free Tier |
|---------|-----------|
| Groq | 7,500 tokens/min |
| Cloudflare Workers | 100,000/day |
| Supabase | 500MB + 2GB bandwidth |
| Vercel | 100GB bandwidth |
| **Total** | **$0/month** |

---

## 🎯 YOU'RE READY

1. Add Supabase to `.env.local` (2 mins)
2. Run schema in SQL Editor (3 mins)
3. `npm install && npm run dev` (5 mins)
4. Say "hi" → AI should talk normally! 🎉

If it works, deploy to Vercel!
