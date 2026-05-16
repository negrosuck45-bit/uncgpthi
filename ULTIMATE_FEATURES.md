UNC-GPT ULTIMATE - ALL VERCEL AI TEMPLATES FEATURES

WHAT'S BUILT IN:

CORE FEATURES:
✅ Chat with Groq (free llama models)
✅ Multiple model selection
✅ Real-time streaming
✅ Conversation history

CODE & EXECUTION:
✅ Python execution (sandbox)
✅ JavaScript execution (sandbox)
✅ Bash execution (sandbox)
✅ Colored terminal output
✅ Code syntax highlighting

DATA & DOCUMENTS:
✅ RAG system (upload PDFs, search)
✅ Document analysis (summary, keywords, sentiment, quiz)
✅ Text-to-speech (via API)
✅ Speech-to-text (via API)

GENERATION:
✅ Image generation (Replicate Flux)
✅ QR code generation (customizable)
✅ Email generator
✅ Newsletter generator
✅ Document templates

SOCIAL & COMMUNICATION:
✅ Social media posts (Twitter, LinkedIn, Instagram, TikTok)
✅ Email composition
✅ Newsletter creation
✅ Slack bot integration (MCP)
✅ Discord bot integration (MCP)

SEARCH & RESEARCH:
✅ Web search (DuckDuckGo)
✅ Document search (RAG)
✅ Semantic search (pgvector)
✅ Research agent capabilities

INTEGRATIONS:
✅ GitHub (list repos, create issues)
✅ Slack (send messages via MCP)
✅ Notion (via MCP)
✅ Google Drive (via MCP)
✅ Linear (via MCP)

ANALYTICS:
✅ Usage tracking
✅ Conversation analytics
✅ Execution logs
✅ Search metrics

DATABASE:
✅ Supabase (30+ tables)
✅ Vector search (pgvector)
✅ Full-text search
✅ User sessions
✅ Analytics data

SETUP (10 MINUTES):

1. Extract zip
   unzip unc-gpt-ULTIMATE.zip
   cd unc-ultimate

2. Supabase setup
   a) supabase.com → create free project
   b) SQL Editor → paste supabase-schema.sql
   c) Run SQL
   d) Copy URL and keys

3. .env.local setup
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   HF_API_KEY=your_hf_key (optional)
   REPLICATE_API_KEY=your_replicate_key (optional, for images)

4. Install
   npm install
   npm install pdf-parse qrcode

5. Run
   npm run dev
   → http://localhost:3000

6. Deploy
   git push origin main
   Vercel auto-deploys

AVAILABLE ENDPOINTS:

/api/chat - Main chat
/api/execute-code - Run code (Python/JS/Bash)
/api/rag/upload - Upload PDFs
/api/rag/search - Search RAG documents
/api/image-generation - Generate images
/api/qr-code - Create QR codes
/api/web-search - Search the web
/api/document-analysis - Analyze text
/api/email - Generate emails/newsletters
/api/social-scheduler - Create social posts
/api/mcp/* - MCP connectors (GitHub, Slack, etc)

FEATURES ROADMAP:

PHASE 1 (Done):
- Chat with streaming
- Code execution
- RAG system
- Image generation
- QR codes
- Web search
- Document analysis
- Email/Newsletter
- Social media
- MCP integrations

PHASE 2 (Add next):
- Voice chat (Web Audio API)
- Video generation
- Website builder
- Presentation generator
- Analytics dashboard
- Team spaces
- Multi-user chat

PHASE 3 (Advanced):
- Fine-tuning interface
- Custom instructions
- Prompt optimization
- Model comparison
- Advanced agents

COST: $0/month
- Groq: Free tier
- Cloudflare: Free tier
- Supabase: Free tier (500MB)
- HuggingFace: Free tier
- Replicate: Free tier (limited)

All features included.
All working.
All free.
Deploy to Vercel - 1 click.

Everything ready to use.
