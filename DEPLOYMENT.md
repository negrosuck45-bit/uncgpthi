ENTERPRISE AI DEPLOYMENT GUIDE

WHAT YOU'RE DEPLOYING:

A full-featured enterprise AI system that:
- Acts like Claude (not a limited "text-based AI")
- Detects and uses MCP connectors
- Can modify files and create artifacts
- Models have full capabilities
- Production-ready architecture

BEFORE DEPLOYMENT:

1. SECURE YOUR GITHUB TOKEN
   - Go to github.com → Settings → Developer settings
   - Delete the exposed token
   - Create a new one
   - Give it repo access only

2. GITHUB SETUP
   Repo: negrosuck45-bit/uncgpthi
   Token: [NEW TOKEN - wait for user to provide]

DEPLOYMENT STEPS:

Step 1: Initialize Git (if not already)
  git config user.name "Your Name"
  git config user.email "your@email.com"
  git remote add origin https://github.com/negrosuck45-bit/uncgpthi.git

Step 2: Add All Files
  git add .
  git commit -m "Enterprise AI: Full Vercel templates + Claude behavior + MCP connectors"

Step 3: Push to GitHub
  git push -u origin main

Step 4: Setup Vercel Deployment
  - Go to vercel.com
  - Connect GitHub repo
  - Set environment variables
  - Deploy

ENVIRONMENT VARIABLES NEEDED:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
HF_API_KEY=your_huggingface_key
GROQ_API_KEY=your_groq_key (optional, has fallback)

WHAT'S NEW IN THIS DEPLOYMENT:

- Enterprise AI System Prompts (system-prompts.ts)
- MCP Connector Detection (/api/mcp-status)
- Artifact Generation Support (/api/artifacts)
- File Modification Capabilities
- Full Claude-like Behavior
- All Vercel Templates Integrated

MCP CONNECTORS AVAILABLE:

When user connects these, Claude can use them:
✅ GitHub - Push code, manage repos
✅ Slack - Send messages
✅ Discord - Webhooks
✅ Linear - Issue tracking
✅ Notion - Database access
✅ Google Drive - File operations
✅ Email - Send emails

AFTER DEPLOYMENT:

1. Visit your Vercel URL
2. Go to Settings > Connectors
3. Connect the MCP services you want
4. Claude will automatically detect and use them
5. Models can now modify files via artifacts
6. Chat with Claude to test

SECURITY NOTES:

- Token is in environment variables (safe)
- File modification is path-validated (safe)
- MCP connectors need user approval (safe)
- No public API keys exposed (safe)
- Production-ready security practices

COST: $0/month
- Vercel free tier
- Supabase free tier
- All APIs free tier
- Everything included

NEXT: Wait for new GitHub token, then deploy.
